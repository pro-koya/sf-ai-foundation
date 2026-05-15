import { sha256 } from "../util/hash.js";
import {
  ConsistencyAssertionError,
  type ConsistencyOptions,
  type ConsistencyResult,
  type ExpectMatchOptions,
} from "./types.js";

const DEFAULT_MIN_EXACT_MATCH = 0.8;
const DEFAULT_MIN_SCHEMA_CONFORMANCE = 1.0;

function defaultCanonicalize<T>(value: T): string {
  return canonicalJson(value);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).toSorted();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${parts.join(",")}}`;
}

export async function runConsistencyCheck<T>(
  options: ConsistencyOptions<T>,
): Promise<ConsistencyResult<T>> {
  if (options.runs < 1) {
    throw new Error("runs must be >= 1");
  }
  const outputs: T[] = [];
  const conforming: T[] = [];
  const validate = options.validate;
  for (let i = 0; i < options.runs; i++) {
    const out = await options.producer();
    outputs.push(out);
    if (validate === undefined || validate(out)) {
      conforming.push(out);
    }
  }

  const canonicalize = options.canonicalize ?? defaultCanonicalize;
  const hashes = outputs.map((o) => sha256(canonicalize(o)));
  const counts = new Map<string, number>();
  for (const h of hashes) counts.set(h, (counts.get(h) ?? 0) + 1);
  const maxCount = Math.max(...counts.values(), 0);
  const exactMatchRate = options.runs > 0 ? maxCount / options.runs : 0;
  const schemaConformanceRate = options.runs > 0 ? conforming.length / options.runs : 0;

  let modal: T | undefined;
  for (const [hash, count] of counts) {
    if (count === maxCount) {
      const idx = hashes.indexOf(hash);
      if (idx >= 0) modal = outputs[idx];
      break;
    }
  }

  const result: ConsistencyResult<T> = {
    runs: options.runs,
    outputs,
    schemaConformanceRate,
    exactMatchRate,
    ...(modal !== undefined ? { modal } : {}),
    hashes,
  };
  return result;
}

export function expectMatchRate<T>(
  result: ConsistencyResult<T>,
  options: ExpectMatchOptions = {},
): void {
  const minExact = options.minExactMatchRate ?? DEFAULT_MIN_EXACT_MATCH;
  const minSchema = options.minSchemaConformance ?? DEFAULT_MIN_SCHEMA_CONFORMANCE;
  if (result.exactMatchRate < minExact) {
    throw new ConsistencyAssertionError(
      `exact match rate ${result.exactMatchRate.toFixed(2)} < required ${minExact.toFixed(2)} (runs=${result.runs})`,
      result,
    );
  }
  if (result.schemaConformanceRate < minSchema) {
    throw new ConsistencyAssertionError(
      `schema conformance ${result.schemaConformanceRate.toFixed(2)} < required ${minSchema.toFixed(2)} (runs=${result.runs})`,
      result,
    );
  }
}
