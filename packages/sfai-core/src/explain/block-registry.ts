// AI_MANAGED ブロック ID の Registry (Phase 14)
// 各エンティティ種別 (ExplainKind) に対し、`/sfai-explain` で書き戻し可能なブロック ID
// のホワイトリストを管理する。テンプレ側の AI_MANAGED ブロックと 1:1 で同期する。
//
// 設計原則:
//   - 単一情報源: 新ブロックを増やすときは本ファイルだけ更新
//   - 検証: cmdExplainWrite が入力 JSON の ID を本 registry と照合し、不正なら早期エラー
//   - subagent / slash command 側もこの ID 一覧と整合する命名で動く

import type { ExplainKind } from "./index.js";

export const ALLOWED_BLOCK_IDS: Record<ExplainKind, readonly string[]> = {
  apexClass: [
    "purpose",
    "concerns",
    "narrative",
    "business-scenario",
    "key-design-decisions",
    "processing-overview-narrative",
    "processing-details-narrative",
  ],
  apexTrigger: [
    "purpose",
    "concerns",
    "narrative",
    "operational-notes",
    "processing-overview-narrative",
    "processing-details-narrative",
  ],
  flow: [
    "purpose",
    "concerns",
    "narrative",
    "business-scenario",
    "operational-notes",
    "processing-overview-narrative",
    "processing-details-narrative",
  ],
  object: ["summary", "narrative", "business-domain"],
  lwc: ["purpose"],
  auraBundle: ["purpose"],
  flexiPage: ["purpose"],
  visualforcePage: ["purpose", "narrative"],
  visualforceComponent: ["purpose"],
  customApplication: ["purpose", "narrative"],
};

export interface BlockValidationResult {
  readonly valid: boolean;
  readonly unknown: readonly string[];
}

/**
 * 入力に含まれるブロック ID が、対象 kind の許容 ID に含まれているか検証する。
 * 含まれない ID は `unknown` 配列で返す。すべて許容なら `valid: true`。
 */
export function validateBlockIds(
  kind: ExplainKind,
  blockIds: readonly string[],
): BlockValidationResult {
  const allowed = new Set(ALLOWED_BLOCK_IDS[kind]);
  const unknown: string[] = [];
  for (const id of blockIds) {
    if (!allowed.has(id)) unknown.push(id);
  }
  return { valid: unknown.length === 0, unknown };
}

/**
 * 各ブロック ID に対し「何を書くべきか」の説明文を返す。
 * subagent / slash command の prompt や CLI のヘルプテキストで使用。
 */
export const BLOCK_PURPOSE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  purpose: "1〜3 行の役割説明 (短く、scannable)",
  concerns: "自動検出に含まれない業務的・運用的な懸念点",
  narrative: "「これは何で、なぜ存在するか」を 2〜3 段落の自然言語で",
  "business-scenario": "業務シナリオの具体例 (いつ・誰の・どのデータで起動するか)",
  "operational-notes": "運用上の罠 / bulk 安全性 / 順序依存 / 例外時の挙動",
  "business-domain": "属する業務ドメインと隣接オブジェクトとの関係",
  "key-design-decisions": "設計判断 (なぜこの構造を選んだか、何を捨てたか)",
  "processing-overview-narrative": "処理の流れの俯瞰 (1〜2 段落で動作を説明)",
  "processing-details-narrative":
    "メソッド/要素単位の処理詳細 (扱うデータ / 分岐条件 / 計算 / 戻り値)",
  summary: "Object の役割と用途 (短く)",
};
