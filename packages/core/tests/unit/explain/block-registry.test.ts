import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ALLOWED_BLOCK_IDS,
  EXPLAIN_KINDS,
  applyExplain,
  validateBlockIds,
} from "../../../src/explain/index.js";

describe("validateBlockIds", () => {
  it("apexClass の許容 ID をすべて受け入れる", () => {
    const result = validateBlockIds("apexClass", [
      "purpose",
      "concerns",
      "narrative",
      "business-scenario",
      "key-design-decisions",
      "processing-overview-narrative",
      "processing-details-narrative",
    ]);
    expect(result.valid).toBe(true);
    expect(result.unknown).toEqual([]);
  });

  it("object の許容 ID は summary / narrative / business-domain", () => {
    const result = validateBlockIds("object", ["narrative", "business-domain", "summary"]);
    expect(result.valid).toBe(true);
  });

  it("apexClass で未知の ID を含むと invalid", () => {
    const result = validateBlockIds("apexClass", ["purpose", "unknown-id"]);
    expect(result.valid).toBe(false);
    expect(result.unknown).toEqual(["unknown-id"]);
  });

  it("flow に business-domain (object 専用) を渡すと invalid", () => {
    const result = validateBlockIds("flow", ["business-domain"]);
    expect(result.valid).toBe(false);
    expect(result.unknown).toEqual(["business-domain"]);
  });
});

describe("EXPLAIN_KINDS / ALLOWED_BLOCK_IDS の網羅性", () => {
  it("EXPLAIN_KINDS に 10 種が登録されている", () => {
    expect(EXPLAIN_KINDS.length).toBe(10);
    expect(EXPLAIN_KINDS).toContain("object");
    expect(EXPLAIN_KINDS).toContain("lwc");
    expect(EXPLAIN_KINDS).toContain("customApplication");
  });

  it("ALLOWED_BLOCK_IDS が EXPLAIN_KINDS と一致する", () => {
    for (const kind of EXPLAIN_KINDS) {
      expect(ALLOWED_BLOCK_IDS[kind]).toBeDefined();
      expect(ALLOWED_BLOCK_IDS[kind].length).toBeGreaterThan(0);
    }
  });

  it("全 kind に最低 'purpose' または 'summary' のいずれかが含まれる", () => {
    for (const kind of EXPLAIN_KINDS) {
      const ids = ALLOWED_BLOCK_IDS[kind];
      expect(ids.includes("purpose") || ids.includes("summary")).toBe(true);
    }
  });
});

const SAMPLE_OBJECT_MD = `# Object: Order__c

<!-- AI_MANAGED_START id="summary" -->
このオブジェクトの役割と用途。
<!-- AI_MANAGED_END id="summary" -->

<!-- AI_MANAGED_START id="narrative" -->
narrative placeholder
<!-- AI_MANAGED_END id="narrative" -->

<!-- AI_MANAGED_START id="business-domain" -->
domain placeholder
<!-- AI_MANAGED_END id="business-domain" -->

<!-- HUMAN_MANAGED_START id="business-context" -->
人間記述。
<!-- HUMAN_MANAGED_END id="business-context" -->
`;

describe("applyExplain — 拡張 kind / registry 検証", () => {
  let root = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "yohaku-explain-ext-"));
    const md = join(root, "docs/generated/objects/Order__c.md");
    mkdirSync(dirname(md), { recursive: true });
    writeFileSync(md, SAMPLE_OBJECT_MD);
  });

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("kind=object で narrative / business-domain / summary を一括書き込みできる", () => {
    const result = applyExplain(
      { kind: "object", fqn: "Order__c", projectRoot: root },
      {
        blocks: {
          summary: "受注を管理するオブジェクト。",
          narrative: "このオブジェクトは ... 業務上の必要性 ...",
          "business-domain": "受注ドメイン。Account / Invoice__c と隣接。",
        },
      },
    );
    expect([...result.updated].sort()).toEqual(["business-domain", "narrative", "summary"]);
    expect(result.skipped).toEqual([]);
  });

  it("kind=object に不正な ID (key-design-decisions) を渡すと早期エラー", () => {
    expect(() =>
      applyExplain(
        { kind: "object", fqn: "Order__c", projectRoot: root },
        {
          blocks: {
            "key-design-decisions": "Apex 専用の ID なので Object には許容されない",
          },
        },
      ),
    ).toThrowError(/Unknown block id/);
  });
});
