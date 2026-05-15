// AI 利用トークン記録の永続化スキーマ
// 利用者プロジェクトの .yohaku/metrics.json に保存される

export type ModelKind = "haiku" | "sonnet" | "opus" | "other";

export interface MetricsEvent {
  readonly timestamp: string;
  readonly model: string;
  readonly modelKind: ModelKind;
  readonly command: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly estimatedCostUsd: number;
  readonly note?: string;
}

export interface MetricsTotals {
  readonly tokens: number;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly estimatedCostUsd: number;
  readonly events: number;
}

export interface MetricsFile {
  readonly version: 1;
  readonly totals: MetricsTotals;
  readonly events: readonly MetricsEvent[];
}

export interface ModelPricing {
  readonly perMillionInputUsd: number;
  readonly perMillionOutputUsd: number;
}

// 既知モデルの参考価格 (2026-04 時点の公開情報、変動するため目安)
// 利用者は .yohaku/metrics-pricing.json で上書き可能 (Phase 7 で実装)
export const DEFAULT_PRICING: ReadonlyMap<string, ModelPricing> = new Map([
  ["claude-haiku-4-5", { perMillionInputUsd: 1, perMillionOutputUsd: 5 }],
  ["claude-sonnet-4-6", { perMillionInputUsd: 3, perMillionOutputUsd: 15 }],
  ["claude-opus-4-7", { perMillionInputUsd: 15, perMillionOutputUsd: 75 }],
]);

export function inferModelKind(model: string): ModelKind {
  if (model.includes("haiku")) return "haiku";
  if (model.includes("sonnet")) return "sonnet";
  if (model.includes("opus")) return "opus";
  return "other";
}

export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = DEFAULT_PRICING.get(model);
  if (pricing === undefined) return 0;
  const costIn = (tokensIn / 1_000_000) * pricing.perMillionInputUsd;
  const costOut = (tokensOut / 1_000_000) * pricing.perMillionOutputUsd;
  return Number((costIn + costOut).toFixed(6));
}

export const EMPTY_METRICS: MetricsFile = {
  version: 1,
  totals: {
    tokens: 0,
    tokensIn: 0,
    tokensOut: 0,
    estimatedCostUsd: 0,
    events: 0,
  },
  events: [],
};
