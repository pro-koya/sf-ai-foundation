// 再現性ガバナンス層 2: source 列必須化
// 詳細 ADR: .agents/knowledge/decisions/2026-05-07-source-column-three-layer-boundary.md

export type Source = "deterministic" | "ai" | "human";

/** AI / 人手 / 決定的処理 のどれが値を生んだかを必ず明示する wrapper */
export interface Tracked<T> {
  readonly value: T;
  readonly source: Source;
  readonly promptHash?: string;
  readonly model?: string;
  readonly temperature?: number;
}

export function deterministic<T>(value: T): Tracked<T> {
  return { value, source: "deterministic" };
}

export function ai<T>(
  value: T,
  meta: { readonly promptHash: string; readonly model: string; readonly temperature: number },
): Tracked<T> {
  return {
    value,
    source: "ai",
    promptHash: meta.promptHash,
    model: meta.model,
    temperature: meta.temperature,
  };
}

export function human<T>(value: T): Tracked<T> {
  return { value, source: "human" };
}

// ChangeSummary スキーマ (Phase 3 の中核)

export type ChangeCategoryKind =
  | "data_model"
  | "automation"
  | "permission"
  | "ui"
  | "logic"
  | "operational"
  | "manual";

export type ChangeKind = "added" | "modified" | "removed" | "renamed";
export type ScopeSize = "small" | "medium" | "large";

export interface SarifFinding {
  readonly ruleId: string;
  readonly level: "none" | "note" | "warning" | "error";
  readonly message: string;
  readonly locations: readonly string[];
}

export interface ChangeEntry {
  readonly entity: Tracked<string>;
  readonly changeKind: Tracked<ChangeKind>;
  readonly scopeSize: Tracked<ScopeSize>;
  readonly affectedEntities: Tracked<readonly string[]>;
  readonly reviewPoints: Tracked<readonly string[]>;
  readonly manualStepsRequired: Tracked<boolean>;
  readonly businessImpactHint: Tracked<string>;
}

export interface CategorySection {
  readonly type: Tracked<ChangeCategoryKind>;
  readonly changes: readonly ChangeEntry[];
}

export interface HumanAnnotations {
  readonly businessContext: Tracked<string>;
  readonly customerCommunicationNeeded: Tracked<boolean>;
}

export interface ChangeSummary {
  readonly id: Tracked<string>;
  readonly createdAt: Tracked<string>;
  readonly fromRef: Tracked<string>;
  readonly toRef: Tracked<string>;
  readonly staticAnalysisFindings: Tracked<readonly SarifFinding[]>;
  readonly categories: readonly CategorySection[];
  readonly humanAnnotations: HumanAnnotations;
}
