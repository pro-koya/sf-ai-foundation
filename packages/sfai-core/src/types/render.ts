// ----------------------------------------------------------------------------
// Render types
//
// docs/generated/ への Markdown 描画。3 種ブロック (DETERMINISTIC / AI_MANAGED /
// HUMAN_MANAGED) の構造と、HUMAN_MANAGED のマージ仕様 (詳細は ADR
// .agents/knowledge/decisions/2026-05-07-human-managed-merge-algorithm.md) を
// 型として表現する。
// ----------------------------------------------------------------------------

export type BlockKind = "deterministic" | "ai_managed" | "human_managed";

export interface ParsedBlock {
  readonly kind: BlockKind;
  readonly id: string;
  readonly content: string;
}

export interface ParsedDocument {
  readonly path: string;
  readonly blocks: readonly ParsedBlock[];
  readonly preludeBeforeFirstMarker?: string;
  readonly tailAfterLastMarker?: string;
}

export type MergeWarningCode =
  | "human_block_missing"
  | "human_block_replaced_with_empty"
  | "human_migrated_from_renamed_entity"
  | "marker_corruption_detected";

export interface MergeWarning {
  readonly code: MergeWarningCode;
  readonly blockId?: string;
  readonly message: string;
  readonly originPath?: string;
}

export interface MergeResult {
  readonly content: string;
  readonly warnings: readonly MergeWarning[];
  readonly humanBlockCount: number;
  readonly preserved: boolean;
}
