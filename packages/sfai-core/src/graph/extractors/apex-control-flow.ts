// Apex メソッド本体の制御フロー抽出 (Phase 8-B1)
// regex + brace counting による軽量パーサ。AST ではない。
//
// サポートする構文:
//   - if (cond) { ... } [else if (cond) { ... }] [else { ... }]
//   - for (...) { ... }
//   - while (cond) { ... }
//   - try { ... } catch (Type e) { ... } [finally { ... }]
//   - return [expr];
//   - throw expr;
//   - [SELECT ... FROM Object ...]    (SOQL)
//   - insert/update/delete/upsert/undelete/merge target;
//   - Database.insert(target, ...)
//   - Class.method(args)
//   - new ClassName(args)
//   - その他は単純文 (semicolon 区切り)
//
// 限界:
//   - do-while は loop として扱うが本体抽出はベストエフォート
//   - 文字列内の `{` `}` は誤検出しないよう strip 済の body を渡す
//   - ラムダ等は出てこない (Apex に無い)
//
// ネストはサポート。失敗時は単純文に fallback する。

import type { ApexControlFlowNode, ApexMethodControlFlow } from "../../types/graph.js";
import { stripApexNoise } from "./apex-body.js";

// graph.ts に定義された型をそのまま使う。エイリアス公開も従来コード互換のため残す。
export type ControlFlowNode = ApexControlFlowNode;
export type MethodControlFlow = ApexMethodControlFlow;
export type IfNode = Extract<ApexControlFlowNode, { kind: "if" }>;
export type ForNode = Extract<ApexControlFlowNode, { kind: "for" }>;
export type WhileNode = Extract<ApexControlFlowNode, { kind: "while" }>;
export type TryNode = Extract<ApexControlFlowNode, { kind: "try" }>;
export type DmlNode = Extract<ApexControlFlowNode, { kind: "dml" }>;

// 修飾子の前は: 行頭 / 改行 / { / } / ; / 単純な空白 のいずれでも OK
const METHOD_HEADER_REGEX =
  /(?:^|[\s;{}])\s*(public|private|protected|global)\s+(?:(?:static|virtual|abstract|override|final)\s+)*([\w<>,\s\?\[\]]+?)\s+(\w+)\s*\(([^)]*)\)\s*\{/gm;

/**
 * クラス全体の中で、各メソッドの { ... } を切り出して制御フロー解析する。
 * 文字列とコメントは事前に除去 (`strip`) してから解析。
 */
export function extractMethodControlFlows(rawContent: string): readonly MethodControlFlow[] {
  const stripped = stripApexNoise(rawContent);
  const result: MethodControlFlow[] = [];
  const re = new RegExp(METHOD_HEADER_REGEX.source, "gm");
  let match: RegExpExecArray | null = re.exec(stripped);
  while (match !== null) {
    const visibility = match[1] ?? "";
    const returnType = (match[2] ?? "").trim().replace(/\s+/g, " ");
    const name = match[3] ?? "";
    const params = (match[4] ?? "").trim();
    if (returnType === "" || name === "" || isControlFlowKeyword(returnType) || isReservedName(name)) {
      match = re.exec(stripped);
      continue;
    }
    const openBraceIdx = re.lastIndex - 1;
    const closeBraceIdx = findMatchingBrace(stripped, openBraceIdx);
    if (closeBraceIdx === -1) {
      match = re.exec(stripped);
      continue;
    }
    const body = stripped.slice(openBraceIdx + 1, closeBraceIdx);
    const nodes = parseStatements(body);
    const signature = `${visibility} ${returnType} ${name}(${params})`.replace(/\s+/g, " ").trim();
    result.push({ methodName: name, signature, nodes });
    re.lastIndex = closeBraceIdx + 1;
    match = re.exec(stripped);
  }
  return dedupeByName(result);
}

function dedupeByName(flows: readonly MethodControlFlow[]): readonly MethodControlFlow[] {
  const seen = new Set<string>();
  const out: MethodControlFlow[] = [];
  for (const f of flows) {
    if (seen.has(f.signature)) continue;
    seen.add(f.signature);
    out.push(f);
  }
  return out;
}

const CONTROL_FLOW_KEYWORDS = new Set([
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "return",
  "throw",
  "try",
  "catch",
  "finally",
  "new",
]);

function isControlFlowKeyword(s: string): boolean {
  return CONTROL_FLOW_KEYWORDS.has(s.trim().toLowerCase());
}

function isReservedName(s: string): boolean {
  return CONTROL_FLOW_KEYWORDS.has(s.toLowerCase());
}

/**
 * text[openIdx] が '{' のとき対応する '}' を返す。strip 済前提。
 * 見つからなければ -1。
 */
export function findMatchingBrace(text: string, openIdx: number): number {
  if (text[openIdx] !== "{") return -1;
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * text[openIdx] が '(' のとき対応する ')' を返す。
 */
function findMatchingParen(text: string, openIdx: number): number {
  if (text[openIdx] !== "(") return -1;
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * メソッド body や if/else 内の文字列を順序つきの ControlFlowNode 列に変換する。
 */
export function parseStatements(text: string): readonly ControlFlowNode[] {
  const nodes: ControlFlowNode[] = [];
  let i = 0;
  while (i < text.length) {
    i = skipWhitespace(text, i);
    if (i >= text.length) break;

    const consumed = tryParseConstruct(text, i, nodes);
    if (consumed > 0) {
      i += consumed;
      continue;
    }

    // 単純文として ; までを 1 ノード
    const stmtEnd = findStatementEnd(text, i);
    const stmt = text.slice(i, stmtEnd).trim();
    if (stmt !== "") {
      const classified = classifySimpleStatement(stmt);
      if (classified !== undefined) nodes.push(classified);
      else nodes.push({ kind: "stmt", text: stmt });
    }
    i = stmtEnd + 1;
  }
  return nodes;
}

function skipWhitespace(text: string, idx: number): number {
  let i = idx;
  while (i < text.length && /\s/.test(text[i] ?? "")) i++;
  return i;
}

/**
 * if / for / while / try / return / throw / SOQL を試行。
 * パースに成功したら nodes に追加し、消費文字数を返す。失敗なら 0。
 */
function tryParseConstruct(text: string, idx: number, out: ControlFlowNode[]): number {
  const head = text.slice(idx, idx + 12);
  // SOQL [...]
  if (text[idx] === "[") {
    const close = findMatchingBracket(text, idx);
    if (close !== -1) {
      const inside = text.slice(idx + 1, close).trim();
      if (/^SELECT\b/i.test(inside) && /\bFROM\b/i.test(inside)) {
        const fromMatch = /\bFROM\s+(\w+)/i.exec(inside);
        out.push({
          kind: "soql",
          raw: inside.replace(/\s+/g, " "),
          primaryObject: fromMatch?.[1] ?? null,
        });
        // 残りの行末 ; までスキップ
        const semi = findStatementEnd(text, close + 1);
        return semi - idx + 1;
      }
    }
  }

  // if (...) { ... }
  if (/^if\b/.test(head)) {
    return parseIfChain(text, idx, out);
  }
  // for (...) { ... }
  if (/^for\b/.test(head)) {
    return parseLoop(text, idx, "for", out);
  }
  // while (...) { ... }
  if (/^while\b/.test(head)) {
    return parseLoop(text, idx, "while", out);
  }
  // try { ... } catch (...) { ... } [finally { ... }]
  if (/^try\b/.test(head)) {
    return parseTry(text, idx, out);
  }
  // return / throw
  const retMatch = /^return\b/.exec(head);
  if (retMatch !== null) {
    const end = findStatementEnd(text, idx + 6);
    const expr = text.slice(idx + 6, end).trim();
    out.push({ kind: "return", expression: expr });
    return end - idx + 1;
  }
  const throwMatch = /^throw\b/.exec(head);
  if (throwMatch !== null) {
    const end = findStatementEnd(text, idx + 5);
    const expr = text.slice(idx + 5, end).trim();
    out.push({ kind: "throw", expression: expr });
    return end - idx + 1;
  }
  return 0;
}

function findMatchingBracket(text: string, openIdx: number): number {
  if (text[openIdx] !== "[") return -1;
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseIfChain(text: string, idx: number, out: ControlFlowNode[]): number {
  // 'if' '(' cond ')' '{' body '}' (else if ...)* (else { ... })?
  const parenStart = text.indexOf("(", idx);
  if (parenStart === -1) return 0;
  const parenEnd = findMatchingParen(text, parenStart);
  if (parenEnd === -1) return 0;
  const condition = text.slice(parenStart + 1, parenEnd).trim();
  const braceStart = skipWhitespace(text, parenEnd + 1);
  let thenNodes: readonly ControlFlowNode[];
  let afterThen: number;
  if (text[braceStart] !== "{") {
    // single-statement if (e.g. `if (cond) return;`). 1 文を parseStatements で正しく分類する
    const semi = findStatementEnd(text, braceStart);
    const stmtText = text.slice(braceStart, semi + 1);
    thenNodes = parseStatements(stmtText);
    afterThen = semi + 1;
  } else {
    const braceEnd = findMatchingBrace(text, braceStart);
    if (braceEnd === -1) return 0;
    thenNodes = parseStatements(text.slice(braceStart + 1, braceEnd));
    afterThen = braceEnd + 1;
  }

  let cursor = skipWhitespace(text, afterThen);
  let elseNodes: readonly ControlFlowNode[] = [];

  if (text.slice(cursor, cursor + 4) === "else") {
    const afterElse = skipWhitespace(text, cursor + 4);
    if (text.slice(afterElse, afterElse + 2) === "if") {
      const collected: ControlFlowNode[] = [];
      const consumed = parseIfChain(text, afterElse, collected);
      if (consumed > 0) {
        elseNodes = collected;
        cursor = afterElse + consumed;
      }
    } else if (text[afterElse] === "{") {
      const elseEnd = findMatchingBrace(text, afterElse);
      if (elseEnd !== -1) {
        elseNodes = parseStatements(text.slice(afterElse + 1, elseEnd));
        cursor = elseEnd + 1;
      }
    } else {
      // single-statement else: 同様に parseStatements
      const semi = findStatementEnd(text, afterElse);
      elseNodes = parseStatements(text.slice(afterElse, semi + 1));
      cursor = semi + 1;
    }
  }
  out.push({ kind: "if", condition, thenNodes, elseNodes });
  return cursor - idx;
}

function parseLoop(
  text: string,
  idx: number,
  variant: "for" | "while",
  out: ControlFlowNode[],
): number {
  const parenStart = text.indexOf("(", idx);
  if (parenStart === -1) return 0;
  const parenEnd = findMatchingParen(text, parenStart);
  if (parenEnd === -1) return 0;
  const header = text.slice(parenStart + 1, parenEnd).trim();
  const braceStart = skipWhitespace(text, parenEnd + 1);
  let body: readonly ControlFlowNode[];
  let afterBody: number;
  if (text[braceStart] !== "{") {
    const semi = findStatementEnd(text, braceStart);
    body = parseStatements(text.slice(braceStart, semi + 1));
    afterBody = semi + 1;
  } else {
    const braceEnd = findMatchingBrace(text, braceStart);
    if (braceEnd === -1) return 0;
    body = parseStatements(text.slice(braceStart + 1, braceEnd));
    afterBody = braceEnd + 1;
  }
  if (variant === "for") out.push({ kind: "for", header, body });
  else out.push({ kind: "while", header, body });
  return afterBody - idx;
}

function parseTry(text: string, idx: number, out: ControlFlowNode[]): number {
  const tryBraceStart = skipWhitespace(text, idx + 3);
  if (text[tryBraceStart] !== "{") return 0;
  const tryBraceEnd = findMatchingBrace(text, tryBraceStart);
  if (tryBraceEnd === -1) return 0;
  const tryNodes = parseStatements(text.slice(tryBraceStart + 1, tryBraceEnd));

  const catches: { exceptionType: string; nodes: readonly ControlFlowNode[] }[] = [];
  let cursor = skipWhitespace(text, tryBraceEnd + 1);
  while (text.slice(cursor, cursor + 5) === "catch") {
    const parenStart = text.indexOf("(", cursor);
    if (parenStart === -1) break;
    const parenEnd = findMatchingParen(text, parenStart);
    if (parenEnd === -1) break;
    const exParam = text.slice(parenStart + 1, parenEnd).trim();
    const exType = exParam.split(/\s+/)[0] ?? "Exception";
    const cBraceStart = skipWhitespace(text, parenEnd + 1);
    if (text[cBraceStart] !== "{") break;
    const cBraceEnd = findMatchingBrace(text, cBraceStart);
    if (cBraceEnd === -1) break;
    catches.push({
      exceptionType: exType,
      nodes: parseStatements(text.slice(cBraceStart + 1, cBraceEnd)),
    });
    cursor = skipWhitespace(text, cBraceEnd + 1);
  }

  let finallyNodes: readonly ControlFlowNode[] = [];
  if (text.slice(cursor, cursor + 7) === "finally") {
    const fBraceStart = skipWhitespace(text, cursor + 7);
    if (text[fBraceStart] === "{") {
      const fBraceEnd = findMatchingBrace(text, fBraceStart);
      if (fBraceEnd !== -1) {
        finallyNodes = parseStatements(text.slice(fBraceStart + 1, fBraceEnd));
        cursor = fBraceEnd + 1;
      }
    }
  }
  out.push({ kind: "try", tryNodes, catches, finallyNodes });
  return cursor - idx;
}

const DML_VERB_REGEX =
  /^\s*(insert|update|delete|upsert|undelete|merge)\s+([a-zA-Z_]\w*)/i;
const DATABASE_DML_REGEX =
  /^\s*Database\.(insert|update|delete|upsert|undelete|merge)\s*\(\s*([\w.]+)/i;
const SOQL_INLINE_REGEX = /\[\s*(SELECT[\s\S]+?\bFROM\s+\w+[\s\S]*?)\]/i;

function classifySimpleStatement(stmt: string): ControlFlowNode | undefined {
  const dml = DML_VERB_REGEX.exec(stmt);
  if (dml !== null) {
    return {
      kind: "dml",
      verb: (dml[1] ?? "").toLowerCase() as DmlNode["verb"],
      target: dml[2] ?? "",
      viaDatabaseClass: false,
    };
  }
  const dbDml = DATABASE_DML_REGEX.exec(stmt);
  if (dbDml !== null) {
    return {
      kind: "dml",
      verb: (dbDml[1] ?? "").toLowerCase() as DmlNode["verb"],
      target: dbDml[2] ?? "",
      viaDatabaseClass: true,
    };
  }
  const soql = SOQL_INLINE_REGEX.exec(stmt);
  if (soql !== null) {
    const inside = (soql[1] ?? "").replace(/\s+/g, " ").trim();
    const fromMatch = /\bFROM\s+(\w+)/i.exec(inside);
    return {
      kind: "soql",
      raw: inside,
      primaryObject: fromMatch?.[1] ?? null,
    };
  }
  return undefined;
}

/**
 * idx 以降で、最も外側の '{' '(' '[' に入っていない位置の ';' を探す。
 * 見つからなければ text.length-1 を返す。
 */
function findStatementEnd(text: string, idx: number): number {
  let curly = 0;
  let paren = 0;
  let bracket = 0;
  for (let i = idx; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") curly++;
    else if (ch === "}") curly--;
    else if (ch === "(") paren++;
    else if (ch === ")") paren--;
    else if (ch === "[") bracket++;
    else if (ch === "]") bracket--;
    else if (ch === ";" && curly === 0 && paren === 0 && bracket === 0) {
      return i;
    }
  }
  return text.length;
}
