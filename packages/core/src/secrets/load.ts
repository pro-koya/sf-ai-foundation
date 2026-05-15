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

/** ユーザ提供正規表現の最大長 (パターン文字列) */
const MAX_PATTERN_LENGTH = 200;
/** マッチング時の総時間ガード (ms)。これを超えるパターンは ReDoS 候補として拒否 */
const PATTERN_BENCHMARK_TIMEOUT_MS = 50;
/** ReDoS の典型形を持つパターンを早期検出する */
function looksLikeRedosPattern(pattern: string): boolean {
  // ネストした量指定子: (a+)+ / (a*)+ / (a+)* / (.+)+ / (\w+)+ など
  // (...)+/* / (...){n,} 直後にさらに +/*/{n,} が続くパターン
  if (/\([^)]*[+*][^)]*\)\s*[+*]/.test(pattern)) return true;
  if (/\([^)]*[+*][^)]*\)\{\d+,?\d*\}/.test(pattern)) return true;
  // 重複した代替分岐: (a|a)+ / (a|ab)* など (簡易)
  if (/\(([^|()]+)\|\1\)[+*]/.test(pattern)) return true;
  // 代替分岐内の overlap (a|a*) の典型形
  if (/\([^|()]*\|[^|()]*\*\)[+*]/.test(pattern)) return true;
  return false;
}

/**
 * 与えられた正規表現が catastrophic backtracking を起こさないか軽量ベンチマーク。
 * `aaaa...!` のような攻撃用入力を生成して 50ms 以内に終わるか確認する。
 * 終わらない場合 ReDoS 候補とみなす。
 */
function passesRedosBenchmark(regex: RegExp): boolean {
  const adversarial = `${"a".repeat(40)}!`;
  const start = Date.now();
  try {
    regex.test(adversarial);
  } catch {
    return false;
  }
  return Date.now() - start <= PATTERN_BENCHMARK_TIMEOUT_MS;
}

function compileSafeRegex(pattern: string, ruleId: string): RegExp {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new SecretsRulesError(
      `Pattern in rule "${ruleId}" exceeds max length ${MAX_PATTERN_LENGTH} (got ${pattern.length})`,
    );
  }
  if (looksLikeRedosPattern(pattern)) {
    throw new SecretsRulesError(
      `Pattern in rule "${ruleId}" looks like a catastrophic-backtracking ReDoS pattern (nested quantifiers detected). Rewrite without nested + or *.`,
    );
  }
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, "g");
  } catch (err) {
    throw new SecretsRulesError(`Invalid regex in rule "${ruleId}": ${(err as Error).message}`);
  }
  if (!passesRedosBenchmark(regex)) {
    throw new SecretsRulesError(
      `Pattern in rule "${ruleId}" took too long on a benign input (>${PATTERN_BENCHMARK_TIMEOUT_MS}ms). Possible ReDoS — rewrite the regex.`,
    );
  }
  return regex;
}

export interface LoadOptions {
  readonly rootPath?: string;
  readonly rulesFile?: string;
  /** ユーザのルールをデフォルトにマージ。同 id があればユーザ優先 */
  readonly mergeWithDefaults?: boolean;
}

/**
 * `<rootPath>/.yohaku/secrets-rules.yaml` を読み込み、SecretRule[] を返す。
 * ファイルが無ければ DEFAULT_RULES を返す。
 */
export function loadSecretsRules(options: LoadOptions = {}): readonly SecretRule[] {
  const root = options.rootPath ?? process.cwd();
  const path = resolve(root, options.rulesFile ?? ".yohaku/secrets-rules.yaml");
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

    const regex = compileSafeRegex(pattern, id);

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
