import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_RULES, SecretsRulesError, loadSecretsRules } from "../../../src/secrets/index.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "yohaku-secrets-"));
  mkdirSync(join(tmpRoot, ".yohaku"), { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

function writeRules(yaml: string): void {
  writeFileSync(join(tmpRoot, ".yohaku/secrets-rules.yaml"), yaml);
}

describe("loadSecretsRules", () => {
  it("ファイルが無ければ DEFAULT_RULES を返す", () => {
    const rules = loadSecretsRules({ rootPath: tmpRoot });
    expect(rules).toBe(DEFAULT_RULES);
  });

  it("ユーザルールを読み、デフォルトとマージする", () => {
    writeRules(`
version: 1
rules:
  - id: customer-acme
    description: ACME customer name
    pattern: 'ACME株式会社'
    level: confidential
    mask: redact
`);
    const rules = loadSecretsRules({ rootPath: tmpRoot });
    expect(rules.length).toBe(DEFAULT_RULES.length + 1);
    expect(rules.find((r) => r.id === "customer-acme")).toBeDefined();
    expect(rules.find((r) => r.id === "email-address")).toBeDefined();
  });

  it("同 id のユーザルールがデフォルトを上書きする", () => {
    writeRules(`
rules:
  - id: email-address
    description: Custom email rule
    pattern: 'CUSTOM'
    level: secret
    mask: redact
`);
    const rules = loadSecretsRules({ rootPath: tmpRoot });
    const emailRule = rules.find((r) => r.id === "email-address");
    expect(emailRule?.description).toBe("Custom email rule");
    expect(emailRule?.level).toBe("secret");
  });

  it("mergeWithDefaults: false でユーザルールのみ", () => {
    writeRules(`
rules:
  - id: only-mine
    description: only this
    pattern: 'X'
    level: internal
    mask: preserve
`);
    const rules = loadSecretsRules({ rootPath: tmpRoot, mergeWithDefaults: false });
    expect(rules.length).toBe(1);
    expect(rules[0]?.id).toBe("only-mine");
  });

  it("不正な YAML は SecretsRulesError", () => {
    writeRules(":\n  - {{ not valid");
    expect(() => loadSecretsRules({ rootPath: tmpRoot })).toThrow(SecretsRulesError);
  });

  it("不正な regex は SecretsRulesError", () => {
    writeRules(`
rules:
  - id: bad-regex
    description: broken
    pattern: '[unclosed'
    level: internal
    mask: preserve
`);
    expect(() => loadSecretsRules({ rootPath: tmpRoot })).toThrow(SecretsRulesError);
  });

  it("不正な level / mask は無視される", () => {
    writeRules(`
rules:
  - id: bad-level
    description: x
    pattern: 'X'
    level: notALevel
    mask: redact
  - id: good
    description: y
    pattern: 'Y'
    level: internal
    mask: preserve
`);
    const rules = loadSecretsRules({ rootPath: tmpRoot, mergeWithDefaults: false });
    expect(rules.find((r) => r.id === "bad-level")).toBeUndefined();
    expect(rules.find((r) => r.id === "good")).toBeDefined();
  });
});
