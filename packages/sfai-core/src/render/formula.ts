// Salesforce 数式 (ValidationRule errorConditionFormula 等) の簡易 parser + 自然語化 (Phase 9-B1)
//
// サポート:
//   - 関数呼び出し: AND, OR, NOT, ISBLANK, ISNULL, ISCHANGED, ISNEW, ISPICKVAL,
//     NULLVALUE, BLANKVALUE, LEN, TEXT, CONTAINS, BEGINS, INCLUDES, etc.
//   - フィールド参照: `Field`, `Object.Field`, `Account__r.Credit__c` (任意の階層)
//   - リテラル: `"..."`, `'...'`, 数値, `TRUE`, `FALSE`, `NULL`
//   - 比較: `=`, `==`, `!=`, `<>`, `<`, `>`, `<=`, `>=`
//   - 論理: `&&`, `||`, `!` (関数版 AND/OR/NOT も可)
//   - 算術: `+`, `-`, `*`, `/`, `&` (文字列結合)
//   - 括弧グルーピング
//
// 限界:
//   - パース失敗時は raw 文字列を返す (誤検出より沈黙が安全)
//   - 三項演算子 IF(cond, a, b) は IF 関数として扱う (引数 3 つを「条件 A なら B、それ以外は C」化)

export type FormulaNode =
  | { readonly kind: "call"; readonly name: string; readonly args: readonly FormulaNode[] }
  | { readonly kind: "field"; readonly path: string }
  | { readonly kind: "literal"; readonly type: "string" | "number" | "bool" | "null"; readonly raw: string }
  | { readonly kind: "binary"; readonly op: string; readonly left: FormulaNode; readonly right: FormulaNode }
  | { readonly kind: "unary"; readonly op: string; readonly operand: FormulaNode };

interface ParseResult {
  readonly ast: FormulaNode;
}

interface ParseFailure {
  readonly error: string;
}

/** 数式をパース。失敗時は { error } を返す */
export function parseFormula(source: string): ParseResult | ParseFailure {
  try {
    const tokens = tokenize(source);
    const parser = new Parser(tokens);
    const ast = parser.parseExpression();
    if (!parser.atEnd()) {
      return { error: `unexpected trailing tokens at position ${parser.position()}` };
    }
    return { ast };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** 自然語 (日本語) に変換。失敗時は raw を返す */
export function formulaToNaturalLanguage(source: string): string {
  if (source.trim() === "") return "(条件式なし)";
  const result = parseFormula(source);
  if ("error" in result) {
    return `(数式の自動解析に失敗 — 原文を参照: \`${source.replace(/\s+/g, " ").trim()}\`)`;
  }
  const lines = renderNode(result.ast, 0);
  return lines.join("\n");
}

// -------- Tokenizer --------

interface Token {
  readonly kind: "ident" | "string" | "number" | "punct";
  readonly value: string;
}

function tokenize(src: string): readonly Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i] ?? "";
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\") j += 2;
        else j++;
      }
      tokens.push({ kind: "string", value: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j] ?? "")) j++;
      tokens.push({ kind: "number", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j] ?? "")) j++;
      tokens.push({ kind: "ident", value: src.slice(i, j) });
      i = j;
      continue;
    }
    // 2-char punct
    const two = src.slice(i, i + 2);
    if (["==", "!=", "<>", "<=", ">=", "&&", "||"].includes(two)) {
      tokens.push({ kind: "punct", value: two });
      i += 2;
      continue;
    }
    if ("=<>+-*/&!(),".includes(ch)) {
      tokens.push({ kind: "punct", value: ch });
      i++;
      continue;
    }
    throw new Error(`unrecognized character at ${i}: ${ch}`);
  }
  return tokens;
}

// -------- Parser (recursive descent, precedence-climbing) --------

const PRECEDENCE: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "=": 3,
  "==": 3,
  "!=": 3,
  "<>": 3,
  "<": 3,
  ">": 3,
  "<=": 3,
  ">=": 3,
  "+": 4,
  "-": 4,
  "&": 4,
  "*": 5,
  "/": 5,
};

class Parser {
  #tokens: readonly Token[];
  #idx = 0;
  constructor(tokens: readonly Token[]) {
    this.#tokens = tokens;
  }
  atEnd(): boolean {
    return this.#idx >= this.#tokens.length;
  }
  position(): number {
    return this.#idx;
  }
  parseExpression(minPrec = 0): FormulaNode {
    let left = this.parseUnary();
    while (true) {
      const tok = this.peek();
      if (tok === undefined || tok.kind !== "punct") break;
      const prec = PRECEDENCE[tok.value];
      if (prec === undefined || prec < minPrec) break;
      this.advance();
      const right = this.parseExpression(prec + 1);
      left = { kind: "binary", op: tok.value, left, right };
    }
    return left;
  }
  parseUnary(): FormulaNode {
    const tok = this.peek();
    if (tok !== undefined && tok.kind === "punct" && (tok.value === "!" || tok.value === "-")) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: "unary", op: tok.value, operand };
    }
    return this.parsePrimary();
  }
  parsePrimary(): FormulaNode {
    const tok = this.peek();
    if (tok === undefined) throw new Error("unexpected end of formula");
    if (tok.kind === "punct" && tok.value === "(") {
      this.advance();
      const inner = this.parseExpression();
      this.expect("punct", ")");
      return inner;
    }
    if (tok.kind === "string") {
      this.advance();
      return { kind: "literal", type: "string", raw: tok.value };
    }
    if (tok.kind === "number") {
      this.advance();
      return { kind: "literal", type: "number", raw: tok.value };
    }
    if (tok.kind === "ident") {
      this.advance();
      // bool / null
      const upper = tok.value.toUpperCase();
      if (upper === "TRUE" || upper === "FALSE") {
        return { kind: "literal", type: "bool", raw: upper };
      }
      if (upper === "NULL") {
        return { kind: "literal", type: "null", raw: "NULL" };
      }
      // function call?
      const next = this.peek();
      if (next !== undefined && next.kind === "punct" && next.value === "(") {
        this.advance();
        const args: FormulaNode[] = [];
        if (!this.matches("punct", ")")) {
          args.push(this.parseExpression());
          while (this.matches("punct", ",")) {
            this.advance();
            args.push(this.parseExpression());
          }
          this.expect("punct", ")");
        } else {
          this.advance();
        }
        return { kind: "call", name: tok.value, args };
      }
      return { kind: "field", path: tok.value };
    }
    throw new Error(`unexpected token ${tok.kind}/${tok.value}`);
  }
  peek(): Token | undefined {
    return this.#tokens[this.#idx];
  }
  advance(): Token | undefined {
    const t = this.#tokens[this.#idx];
    this.#idx++;
    return t;
  }
  matches(kind: Token["kind"], value: string): boolean {
    const t = this.peek();
    return t !== undefined && t.kind === kind && t.value === value;
  }
  expect(kind: Token["kind"], value: string): void {
    const t = this.peek();
    if (t === undefined || t.kind !== kind || t.value !== value) {
      throw new Error(`expected ${kind}/${value}, got ${t?.kind}/${t?.value}`);
    }
    this.advance();
  }
}

// -------- Renderer (AST → 日本語 lines) --------

function renderNode(node: FormulaNode, indent: number): string[] {
  switch (node.kind) {
    case "call":
      return renderCall(node, indent);
    case "field":
      return [renderField(node.path)];
    case "literal":
      return [renderLiteral(node)];
    case "binary":
      return [renderBinaryInline(node)];
    case "unary":
      if (node.op === "!") {
        const inner = renderNodeInline(node.operand);
        return [`${inner}でない`];
      }
      return [`${node.op}${renderNodeInline(node.operand)}`];
  }
}

function renderCall(node: Extract<FormulaNode, { kind: "call" }>, indent: number): string[] {
  const upper = node.name.toUpperCase();
  switch (upper) {
    case "AND":
      return renderConjunction(node.args, "**全て**", indent);
    case "OR":
      return renderConjunction(node.args, "**いずれか**", indent);
    case "NOT":
      if (node.args.length === 1 && node.args[0]) {
        return [`${renderNodeInline(node.args[0])}**でない**`];
      }
      break;
    case "ISBLANK":
    case "ISNULL":
      if (node.args[0]) {
        return [`${renderNodeInline(node.args[0])} が空 / null である`];
      }
      break;
    case "ISCHANGED":
      if (node.args[0]) {
        return [`${renderNodeInline(node.args[0])} が変更された`];
      }
      break;
    case "ISNEW":
      return ["新規レコード作成時"];
    case "ISPICKVAL":
      if (node.args[0] && node.args[1]) {
        return [
          `${renderNodeInline(node.args[0])} の値が ${renderNodeInline(node.args[1])} に等しい`,
        ];
      }
      break;
    case "PRIORVALUE":
      if (node.args[0]) return [`${renderNodeInline(node.args[0])} の旧値`];
      break;
    case "TEXT":
      if (node.args[0]) return [`${renderNodeInline(node.args[0])} (文字列化)`];
      break;
    case "LEN":
      if (node.args[0]) return [`${renderNodeInline(node.args[0])} の文字数`];
      break;
    case "NULLVALUE":
    case "BLANKVALUE":
      if (node.args[0] && node.args[1]) {
        return [
          `(${renderNodeInline(node.args[0])} が空なら ${renderNodeInline(node.args[1])})`,
        ];
      }
      break;
    case "CONTAINS":
      if (node.args[0] && node.args[1]) {
        return [
          `${renderNodeInline(node.args[0])} に ${renderNodeInline(node.args[1])} が含まれる`,
        ];
      }
      break;
    case "BEGINS":
      if (node.args[0] && node.args[1]) {
        return [
          `${renderNodeInline(node.args[0])} が ${renderNodeInline(node.args[1])} で始まる`,
        ];
      }
      break;
    case "IF":
      if (node.args.length === 3) {
        const cond = node.args[0];
        const thenExpr = node.args[1];
        const elseExpr = node.args[2];
        if (cond !== undefined && thenExpr !== undefined && elseExpr !== undefined) {
          return [
            `(${renderNodeInline(cond)} なら ${renderNodeInline(thenExpr)}、そうでなければ ${renderNodeInline(elseExpr)})`,
          ];
        }
      }
      break;
    default:
      break;
  }
  // 未知関数: そのまま
  const argsRendered = node.args.map((a) => renderNodeInline(a)).join(", ");
  return [`${node.name}(${argsRendered})`];
}

function renderConjunction(
  args: readonly FormulaNode[],
  label: string,
  indent: number,
): string[] {
  if (args.length === 0) return [`(空の ${label})`];
  if (args.length === 1 && args[0]) return renderNode(args[0], indent);
  const lines: string[] = [`以下を ${label} 満たす:`];
  for (const a of args) {
    const sub = renderNode(a, indent + 1);
    lines.push(`${"  ".repeat(indent)}- ${sub.join("\n" + "  ".repeat(indent + 1))}`);
  }
  return lines;
}

function renderBinaryInline(node: Extract<FormulaNode, { kind: "binary" }>): string {
  const left = renderNodeInline(node.left);
  const right = renderNodeInline(node.right);
  switch (node.op) {
    case "=":
    case "==":
      return `${left} が ${right} に等しい`;
    case "!=":
    case "<>":
      return `${left} が ${right} と等しくない`;
    case "<":
      return `${left} が ${right} 未満`;
    case ">":
      return `${left} が ${right} を超える`;
    case "<=":
      return `${left} が ${right} 以下`;
    case ">=":
      return `${left} が ${right} 以上`;
    case "&&":
      return `(${left} かつ ${right})`;
    case "||":
      return `(${left} または ${right})`;
    case "&":
      return `(${left} と ${right} を結合)`;
    case "+":
    case "-":
    case "*":
    case "/":
      return `(${left} ${node.op} ${right})`;
    default:
      return `${left} ${node.op} ${right}`;
  }
}

function renderNodeInline(node: FormulaNode): string {
  const lines = renderNode(node, 0);
  return lines.join(" ");
}

function renderField(path: string): string {
  return `\`${path}\``;
}

function renderLiteral(lit: Extract<FormulaNode, { kind: "literal" }>): string {
  if (lit.type === "string") return lit.raw; // 引用符を含む
  if (lit.type === "bool") return lit.raw === "TRUE" ? "true" : "false";
  if (lit.type === "null") return "NULL";
  return lit.raw;
}
