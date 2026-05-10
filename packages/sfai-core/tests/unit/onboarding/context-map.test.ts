import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONTEXT_MAP,
  expandReadOrder,
  loadContextMap,
} from "../../../src/onboarding/index.js";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "sfai-ctxmap-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeMap(content: string): void {
  const dir = join(tmp, ".sfai");
  writeFileSync(`${dir}/context-map.yaml`, content);
}

describe("loadContextMap", () => {
  it("ファイル無しなら DEFAULT_CONTEXT_MAP を返す", () => {
    const map = loadContextMap({ rootPath: tmp });
    expect(map).toBe(DEFAULT_CONTEXT_MAP);
  });

  it("YAML を読み、project.name と domains を抽出", () => {
    require("node:fs").mkdirSync(join(tmp, ".sfai"), { recursive: true });
    writeMap(`
project:
  name: my-trial
  domains:
    - id: sales
      description: 営業ドメイン
      primary_objects: [Account, Order__c]
      key_docs: [docs/generated/objects/Account.md]
    - id: finance
      description: 経理
      primary_objects: [Invoice__c]
      key_docs: []
`);
    const map = loadContextMap({ rootPath: tmp });
    expect(map.project.name).toBe("my-trial");
    expect(map.project.domains).toHaveLength(2);
    expect(map.project.domains[0]?.id).toBe("sales");
    expect(map.project.domains[0]?.primaryObjects).toEqual(["Account", "Order__c"]);
  });

  it("personas のみ上書きを許可、未指定はデフォルト維持", () => {
    require("node:fs").mkdirSync(join(tmp, ".sfai"), { recursive: true });
    writeMap(`
personas:
  reviewer:
    goal: カスタムレビュー目標
`);
    const map = loadContextMap({ rootPath: tmp });
    expect(map.personas.reviewer.goal).toBe("カスタムレビュー目標");
    // 他の persona はデフォルト
    expect(map.personas.new_joiner.depth).toBe("summary_first");
  });
});

describe("expandReadOrder", () => {
  it("domains:* を実ドメインに展開", () => {
    const persona = DEFAULT_CONTEXT_MAP.personas.new_joiner;
    const customMap = {
      ...DEFAULT_CONTEXT_MAP,
      project: {
        ...DEFAULT_CONTEXT_MAP.project,
        domains: [
          { id: "sales", description: "", primaryObjects: [], keyDocs: [] },
          { id: "finance", description: "", primaryObjects: [], keyDocs: [] },
        ],
      },
    };
    const expanded = expandReadOrder(persona, customMap);
    expect(expanded).toContain("domain:sales");
    expect(expanded).toContain("domain:finance");
    expect(expanded).not.toContain("domains:*");
  });
});
