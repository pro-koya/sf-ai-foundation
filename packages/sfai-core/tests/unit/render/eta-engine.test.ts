import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderEta } from "../../../src/render/eta-engine.js";

// renderEta 自体は templates/ ディレクトリに固定されているため、
// 経路の post-process 性質をテストするにはサンプル fixture を作って描画する必要がある。
// ただ簡便のため、本 test はテンプレート src 配下の既存 .eta は対象にせず、
// post-process の挙動を SystemIndex 描画など実物経由で間接検証する形をとる。
// → 実物経由は他のテストでカバーされているため、ここでは単純な「table 行間空行詰め」の挙動を確認する目的で、
//   render.ts の renderSystemIndex を呼び、出力に表構造の空行が無いことを確認する。

import { renderSystemIndex } from "../../../src/render/render.js";
import type { KnowledgeGraph } from "../../../src/types/graph.js";

const META: KnowledgeGraph["meta"] = {
  sfaiVersion: "test",
  builtAt: "2026-05-08T00:00:00Z",
  sourceAdapter: "local",
  salesforceApiVersion: "62.0",
  sourceHash: "h",
};

const EMPTY_GRAPH: KnowledgeGraph = {
  meta: META,
  objects: [
    {
      fullyQualifiedName: "Order__c",
      label: "Order",
      isCustom: true,
      sourcePath: "p",
      contentHash: "h",
    },
    {
      fullyQualifiedName: "Account",
      label: "Account",
      isCustom: false,
      sourcePath: "p",
      contentHash: "h",
    },
  ],
  fields: [],
  validationRules: [],
  flows: [],
  apexClasses: [],
  apexTriggers: [],
  permissionSets: [],
  profiles: [],
  recordTypes: [],
  approvalProcesses: [],
  sharingRules: [],
  layouts: [],
  customMetadataRecords: [],
  namedCredentials: [],
  remoteSiteSettings: [],
  lwcs: [],
  auraBundles: [],
  flexiPages: [],
  visualforcePages: [],
  visualforceComponents: [],
  customApplications: [],
  dependencies: [],
  tags: [],
};

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sfai-render-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("renderEta post-process — Markdown table compaction", () => {
  it("system-index の counts 表で行間に空行が残らない", () => {
    const result = renderSystemIndex(EMPTY_GRAPH, tmpDir);
    expect(result.warnings).toEqual([]);

    // 出力ファイルを読む
    const outPath = result.written[0];
    expect(outPath).toBeDefined();
    if (outPath === undefined) return;
    const content = require("node:fs").readFileSync(outPath, "utf8") as string;

    // 表行の直後に空行 + 表行という壊れたパターンが無いことを確認
    expect(content).not.toMatch(/\|[^\n]*\|\n[ \t]*\n\|/);
    // ヘッダ + 区切り + データ行が連続していること
    expect(content).toMatch(/\|---\|---\|\n\| Objects \|/);
  });

  it("3 連続以上の空行は 2 行に圧縮される", () => {
    const result = renderSystemIndex(EMPTY_GRAPH, tmpDir);
    const outPath = result.written[0];
    if (outPath === undefined) return;
    const content = require("node:fs").readFileSync(outPath, "utf8") as string;
    expect(content).not.toMatch(/\n{4,}/);
  });
});
