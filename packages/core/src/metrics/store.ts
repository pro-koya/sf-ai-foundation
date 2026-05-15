import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  EMPTY_METRICS,
  type MetricsEvent,
  type MetricsFile,
  type MetricsTotals,
  estimateCost,
  inferModelKind,
} from "./types.js";

const DEFAULT_PATH = ".yohaku/metrics.json";
const MAX_EVENTS_RETAINED = 5000;

export interface MetricsStoreOptions {
  readonly rootPath: string;
  readonly metricsFile?: string;
}

export class MetricsStore {
  readonly #filePath: string;

  constructor(options: MetricsStoreOptions) {
    this.#filePath = resolve(options.rootPath, options.metricsFile ?? DEFAULT_PATH);
  }

  read(): MetricsFile {
    if (!existsSync(this.#filePath)) return EMPTY_METRICS;
    try {
      const raw = readFileSync(this.#filePath, "utf8");
      const parsed = JSON.parse(raw) as MetricsFile;
      if (parsed.version === 1 && Array.isArray(parsed.events)) {
        return parsed;
      }
      return EMPTY_METRICS;
    } catch {
      return EMPTY_METRICS;
    }
  }

  record(input: {
    readonly model: string;
    readonly command: string;
    readonly tokensIn: number;
    readonly tokensOut: number;
    readonly note?: string;
  }): MetricsEvent {
    const event: MetricsEvent = {
      timestamp: new Date().toISOString(),
      model: input.model,
      modelKind: inferModelKind(input.model),
      command: input.command,
      tokensIn: input.tokensIn,
      tokensOut: input.tokensOut,
      estimatedCostUsd: estimateCost(input.model, input.tokensIn, input.tokensOut),
      ...(input.note !== undefined ? { note: input.note } : {}),
    };

    const current = this.read();
    const events = [...current.events, event].slice(-MAX_EVENTS_RETAINED);
    const next: MetricsFile = {
      version: 1,
      totals: recomputeTotals(events),
      events,
    };
    this.write(next);
    return event;
  }

  write(file: MetricsFile): void {
    mkdirSync(dirname(this.#filePath), { recursive: true });
    writeFileSync(this.#filePath, `${JSON.stringify(file, null, 2)}\n`);
  }
}

function recomputeTotals(events: readonly MetricsEvent[]): MetricsTotals {
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
