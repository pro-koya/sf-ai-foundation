import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface TimingEntry {
  readonly timestamp: string;
  readonly command: string;
  readonly durationMs: number;
  readonly mode?: string;
  readonly extra?: Record<string, unknown>;
}

/**
 * `.yohaku/hook-timings.jsonl` に 1 行 JSON で実行時間を追記する。
 * - 追記失敗は黙って無視 (本処理を絶対に止めない)
 * - 閾値超過時は stderr に warning (デフォルト 2000ms)
 */
export function appendTimingLog(
  logPath: string,
  entry: TimingEntry,
  options: { readonly warnThresholdMs?: number; readonly silent?: boolean } = {},
): void {
  const threshold = options.warnThresholdMs ?? 2000;
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
  } catch {
    // 計測の失敗は本処理を巻き込まない
  }
  if (!options.silent && entry.durationMs > threshold) {
    const seconds = (entry.durationMs / 1000).toFixed(2);
    const thresholdSec = threshold / 1000;
    console.error(
      `[yohaku] warning: ${entry.command} took ${seconds}s (> ${thresholdSec}s threshold). If this runs from a Claude Code hook, consider --async or moving to a Stop hook. See docs/03-reference/knowledge-graph-schema.md and CHANGELOG for tuning options.`,
    );
  }
}

/**
 * 高分解能タイマーで処理時間 (ms) を返すユーティリティ。
 */
export function measureMs<T>(fn: () => T): { readonly result: T; readonly durationMs: number } {
  const start = process.hrtime.bigint();
  const result = fn();
  const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  return { result, durationMs };
}

export async function measureMsAsync<T>(fn: () => Promise<T>): Promise<{
  readonly result: T;
  readonly durationMs: number;
}> {
  const start = process.hrtime.bigint();
  const result = await fn();
  const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  return { result, durationMs };
}
