import type { MetricsEvent, MetricsFile, MetricsTotals } from "./types.js";

export type Period = "day" | "week" | "month" | "all";

export interface PeriodSummary {
  readonly period: Period;
  readonly since: string;
  readonly totals: MetricsTotals;
  readonly byModel: ReadonlyMap<string, MetricsTotals>;
  readonly byCommand: ReadonlyMap<string, MetricsTotals>;
}

export function summarize(file: MetricsFile, period: Period): PeriodSummary {
  const since = computeSince(period);
  const filtered = file.events.filter((e) => e.timestamp >= since);
  return {
    period,
    since,
    totals: aggregateTotals(filtered),
    byModel: groupBy(filtered, (e) => e.model),
    byCommand: groupBy(filtered, (e) => e.command),
  };
}

function computeSince(period: Period): string {
  if (period === "all") return "1970-01-01T00:00:00.000Z";
  const now = new Date();
  const days = period === "day" ? 1 : period === "week" ? 7 : 30;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return since.toISOString();
}

function aggregateTotals(events: readonly MetricsEvent[]): MetricsTotals {
  let tokensIn = 0;
  let tokensOut = 0;
  let cost = 0;
  for (const e of events) {
    tokensIn += e.tokensIn;
    tokensOut += e.tokensOut;
    cost += e.estimatedCostUsd;
  }
  return {
    tokens: tokensIn + tokensOut,
    tokensIn,
    tokensOut,
    estimatedCostUsd: Number(cost.toFixed(6)),
    events: events.length,
  };
}

function groupBy(
  events: readonly MetricsEvent[],
  keyFn: (e: MetricsEvent) => string,
): ReadonlyMap<string, MetricsTotals> {
  const buckets = new Map<string, MetricsEvent[]>();
  for (const e of events) {
    const key = keyFn(e);
    const list = buckets.get(key) ?? [];
    list.push(e);
    buckets.set(key, list);
  }
  const result = new Map<string, MetricsTotals>();
  for (const [key, list] of buckets) {
    result.set(key, aggregateTotals(list));
  }
  return result;
}
