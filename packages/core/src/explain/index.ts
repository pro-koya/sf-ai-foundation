// AI_MANAGED ブロック安全更新ヘルパー (Phase 8-A2)
// /yohaku-explain slash command が生成した文面を、対象 Markdown の AI_MANAGED ブロックに**だけ**書き戻す。
//
// 設計原則:
//   - DETERMINISTIC / HUMAN_MANAGED ブロックには絶対触らない
//   - マーカー (<!-- AI_MANAGED_START id="..." --> / END) は破壊しない
//   - replaceBlockContent (merge/parser.ts) を経由するので、未知の id は単に無視される

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { replaceBlockContent } from "../merge/parser.js";
import { assertWithinRoot } from "../util/path-guard.js";
import { ALLOWED_BLOCK_IDS, validateBlockIds } from "./block-registry.js";

/**
 * fqn として安全な文字のみを許可する。
 * Salesforce の FQN は通常 `[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*` で表現される。
 * `../` 等のパス区切りやスラッシュは禁止 (writes outside projectRoot 防止)。
 */
const SAFE_FQN_PATTERN = /^[A-Za-z0-9_]+(?:[._-][A-Za-z0-9_]+)*$/;

function assertSafeFqn(fqn: string): void {
  if (fqn.length === 0 || fqn.length > 256) {
    throw new Error("Invalid fqn: empty or too long");
  }
  if (!SAFE_FQN_PATTERN.test(fqn)) {
    throw new Error(
      `Invalid fqn "${fqn}": only [A-Za-z0-9_.-] allowed. Path-traversal attempts are rejected.`,
    );
  }
}

export {
  ALLOWED_BLOCK_IDS,
  BLOCK_PURPOSE_DESCRIPTIONS,
  validateBlockIds,
} from "./block-registry.js";

export type ExplainKind =
  | "apexClass"
  | "apexTrigger"
  | "flow"
  | "object"
  | "lwc"
  | "auraBundle"
  | "flexiPage"
  | "visualforcePage"
  | "visualforceComponent"
  | "customApplication";

export const EXPLAIN_KINDS: readonly ExplainKind[] = [
  "apexClass",
  "apexTrigger",
  "flow",
  "object",
  "lwc",
  "auraBundle",
  "flexiPage",
  "visualforcePage",
  "visualforceComponent",
  "customApplication",
];

export interface ExplainInput {
  /** AI_MANAGED ブロック id → 中身 (Markdown) */
  readonly blocks: Readonly<Record<string, string>>;
}

export interface ExplainTarget {
  readonly kind: ExplainKind;
  readonly fqn: string;
  readonly projectRoot: string;
  /** 既定値: docs/generated. 検証ゲートで上書き可能 */
  readonly outputDir?: string;
}

export interface ExplainResult {
  readonly markdownPath: string;
  readonly updated: readonly string[];
  readonly skipped: readonly string[];
}

const KIND_TO_SUBDIR: Record<ExplainKind, string> = {
  apexClass: "apex",
  apexTrigger: "triggers",
  flow: "flows",
  object: "objects",
  lwc: "lwc",
  auraBundle: "aura",
  flexiPage: "flexi-pages",
  visualforcePage: "visualforce-pages",
  visualforceComponent: "visualforce-components",
  customApplication: "applications",
};

export function resolveMarkdownPath(target: ExplainTarget): string {
  // fqn を介したパストラバーサルを拒否
  assertSafeFqn(target.fqn);
  const out = target.outputDir ?? "docs/generated";
  const sub = KIND_TO_SUBDIR[target.kind];
  const resolved = resolve(target.projectRoot, out, sub, `${target.fqn}.md`);
  // 念押しの境界チェック (outputDir が `../` を含むケース等)
  assertWithinRoot(target.projectRoot, resolved, "explain markdown path");
  return resolved;
}

export function applyExplain(target: ExplainTarget, input: ExplainInput): ExplainResult {
  // Phase 14: registry に登録されていない ID は早期に拒否 (typo 防止)
  const inputIds = Object.keys(input.blocks);
  const registry = validateBlockIds(target.kind, inputIds);
  if (!registry.valid) {
    const allowed = ALLOWED_BLOCK_IDS[target.kind].join(", ");
    throw new Error(
      `[explain] Unknown block id(s) for kind="${target.kind}": ${registry.unknown.join(
        ", ",
      )}. Allowed: ${allowed}`,
    );
  }

  const markdownPath = resolveMarkdownPath(target);
  if (!existsSync(markdownPath)) {
    throw new Error(
      `Markdown が見つかりません: ${markdownPath}. 先に \`yohaku sync\` を実行してください。`,
    );
  }
  const original = readFileSync(markdownPath, "utf8");
  let updated = original;
  const updatedIds: string[] = [];
  const skippedIds: string[] = [];

  for (const [id, body] of Object.entries(input.blocks)) {
    const before = updated;
    const sanitized = sanitizeBlockBody(body);
    updated = replaceBlockContent(updated, "ai_managed", id, `\n${sanitized}\n`);
    if (updated === before) {
      // ブロックが見つからなかった = テンプレ側に存在しない id (registry には載っているが
      // 実 Markdown 上で AI_MANAGED マーカーが見当たらないケース)
      skippedIds.push(id);
    } else {
      updatedIds.push(id);
    }
  }

  // 念押し: HUMAN_MANAGED と DETERMINISTIC のマーカー数が変わっていないこと
  ensureMarkerInvariants(original, updated);

  mkdirSync(dirname(markdownPath), { recursive: true });
  writeFileSync(markdownPath, updated);
  return { markdownPath, updated: updatedIds, skipped: skippedIds };
}

/**
 * AI 出力のマーカー断片を除去 (MED-2 対策)。
 * AI が `<!-- AI_MANAGED_END -->` 等を生成した場合、ensureMarkerInvariants の
 * カウントが偶数で並べば素通りしてブロック構造を壊しうる。明示的に剥がす。
 */
const MARKER_FRAGMENT_PATTERN =
  /<!--\s*(DETERMINISTIC|AI_MANAGED|HUMAN_MANAGED)_(START|END)(?:\s+id="[^"]*")?\s*-->/g;

/** ブロック中身を安全な形に整える (markdown 文字列の前後空白を整理、マーカー除去) */
function sanitizeBlockBody(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(MARKER_FRAGMENT_PATTERN, "")
    .replace(/\s+$/g, "")
    .replace(/^\s+/g, "");
}

function ensureMarkerInvariants(before: string, after: string): void {
  const startCount = (s: string, marker: string) => s.split(marker).length - 1;
  const markers = [
    "<!-- DETERMINISTIC_START",
    "<!-- DETERMINISTIC_END",
    "<!-- AI_MANAGED_START",
    "<!-- AI_MANAGED_END",
    "<!-- HUMAN_MANAGED_START",
    "<!-- HUMAN_MANAGED_END",
  ];
  for (const m of markers) {
    if (startCount(before, m) !== startCount(after, m)) {
      throw new Error(`マーカー ${m} の数が変化しました。安全のため書き戻しを中止します。`);
    }
  }
}
