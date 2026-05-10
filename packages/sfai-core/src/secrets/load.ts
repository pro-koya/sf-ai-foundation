import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { DEFAULT_RULES } from "./rules.js";
import type { SecretRule, SensitivityLevel } from "./rules.js";

const VALID_LEVELS: readonly SensitivityLevel[] = ["public", "internal", "confidential", "secret"];
const VALID_MASKS = ["redact", "hash", "preserve"] as const;

export class SecretsRulesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecretsRulesError";
  }
}

export interface LoadOptions {
  readonly rootPath?: string;
  readonly rulesFile?: string;
  /** ユーザのルールをデフォルトにマージ。同 id があればユーザ優先 */
  readonly mergeWithDefaults?: boolean;
}

/**
 * `<rootPath>/.sfai/secrets-rules.yaml` を読み込み、SecretRule[] を返す。
 * ファイルが無ければ DEFAULT_RULES を返す。
 */
export function loadSecretsRules(options: LoadOptions = {}): readonly SecretRule[] {
  const root = options.rootPath ?? process.cwd();
  const path = resolve(root, options.rulesFile ?? ".sfai/secrets-rules.yaml");
  if (!existsSync(path)) {
    return DEFAULT_RULES;
  }

  const raw = readFileSync(path, "utf8");
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new SecretsRulesError(`Failed to parse secrets-rules.yaml: ${(err as Error).message}`);
  }
  const userRules = normalizeRules(parsed);

  if (options.mergeWithDefaults === false) {
    return userRules;
  }
  return mergeWithDefaults(userRules);
}

function normalizeRules(parsed: unknown): readonly SecretRule[] {
  if (parsed === null || typeof parsed !== "object") return [];
  const obj = parsed as Record<string, unknown>;
  const rulesRaw = obj.rules;
  if (!Array.isArray(rulesRaw)) return [];

  const result: SecretRule[] = [];
  for (const entry of rulesRaw) {
    if (entry === null || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const id = e.id;
    const description = e.description;
    const pattern = e.pattern;
    const level = e.level;
    const mask = e.mask;
    if (
      typeof id !== "string" ||
      typeof description !== "string" ||
      typeof pattern !== "string" ||
      typeof level !== "string" ||
      typeof mask !== "string"
    ) {
      continue;
    }
    if (!VALID_LEVELS.includes(level as SensitivityLevel)) continue;
    if (!(VALID_MASKS as readonly string[]).includes(mask)) continue;

    let regex: RegExp;
    try {
      regex = new RegExp(pattern, "g");
    } catch (err) {
      throw new SecretsRulesError(`Invalid regex in rule "${id}": ${(err as Error).message}`);
    }

    result.push({
      id,
      description,
      pattern: regex,
      level: level as SensitivityLevel,
      mask: mask as SecretRule["mask"],
    });
  }
  return result;
}

function mergeWithDefaults(userRules: readonly SecretRule[]): readonly SecretRule[] {
  const userIds = new Set(userRules.map((r) => r.id));
  const defaultsKept = DEFAULT_RULES.filter((r) => !userIds.has(r.id));
  return [...defaultsKept, ...userRules];
}
