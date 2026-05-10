import { sha256 } from "../util/hash.js";
import type { SecretRule, SensitivityLevel } from "./rules.js";
import { DEFAULT_RULES } from "./rules.js";

export interface MaskingHit {
  readonly ruleId: string;
  readonly level: SensitivityLevel;
  readonly start: number;
  readonly end: number;
  readonly originalLength: number;
  readonly action: "redacted" | "hashed" | "preserved";
}

export interface MaskingResult {
  readonly masked: string;
  readonly hits: readonly MaskingHit[];
}

export function maskContent(
  content: string,
  rules: readonly SecretRule[] = DEFAULT_RULES,
): MaskingResult {
  let working = content;
  const hits: MaskingHit[] = [];

  for (const rule of rules) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    const next = working.replace(regex, (match, offset: number) => {
      const replacement = applyMask(rule, match);
      hits.push({
        ruleId: rule.id,
        level: rule.level,
        start: offset,
        end: offset + match.length,
        originalLength: match.length,
        action: rule.mask === "redact" ? "redacted" : rule.mask === "hash" ? "hashed" : "preserved",
      });
      return replacement;
    });
    working = next;
  }

  return { masked: working, hits };
}

function applyMask(rule: SecretRule, value: string): string {
  switch (rule.mask) {
    case "redact":
      return `[REDACTED:${rule.id}]`;
    case "hash":
      return `[HASHED:${rule.id}:${sha256(value).slice(7, 19)}]`;
    case "preserve":
      return value;
  }
}
