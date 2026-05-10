import { readFileSync } from "node:fs";
import type { NormalizedFinding, SarifLog, SarifResult } from "./types.js";

export class SarifParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SarifParseError";
  }
}

export function parseSarifFile(path: string): readonly NormalizedFinding[] {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new SarifParseError(`Failed to read SARIF file ${path}: ${(err as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new SarifParseError(`Invalid JSON in SARIF file: ${(err as Error).message}`);
  }
  return normalizeSarif(parsed);
}

export function normalizeSarif(parsed: unknown): readonly NormalizedFinding[] {
  if (parsed === null || typeof parsed !== "object") return [];
  const log = parsed as SarifLog;
  const findings: NormalizedFinding[] = [];
  for (const run of log.runs ?? []) {
    const tool = run.tool?.driver?.name;
    for (const result of run.results ?? []) {
      const finding = toNormalized(result, tool);
      if (finding !== undefined) findings.push(finding);
    }
  }
  return findings;
}

function toNormalized(
  result: SarifResult,
  tool: string | undefined,
): NormalizedFinding | undefined {
  const ruleId = result.ruleId ?? "unknown-rule";
  const level = result.level ?? "warning";
  const message = result.message?.text ?? "";
  const locations = (result.locations ?? [])
    .map((loc) => loc.physicalLocation?.artifactLocation?.uri)
    .filter((u): u is string => typeof u === "string");
  return {
    ruleId,
    level,
    message,
    locations,
    ...(tool !== undefined ? { tool } : {}),
  };
}
