import { describe, expect, it } from "vitest";
import { type ChangeSummary, ai, deterministic, human } from "../../../src/change-summary/index.js";
import { extractManualSteps } from "../../../src/release/index.js";

function buildSummary(categories: ChangeSummary["categories"]): ChangeSummary {
  return {
    id: deterministic("cs-test-001"),
    createdAt: deterministic("2026-05-07T00:00:00Z"),
    fromRef: deterministic("HEAD~1"),
    toRef: deterministic("HEAD"),
    staticAnalysisFindings: deterministic([]),
    categories,
    humanAnnotations: {
      businessContext: human(""),
      customerCommunicationNeeded: human(false),
    },
  };
}

const aiMeta = { promptHash: "h", model: "claude-sonnet-4-6", temperature: 0 };

describe("extractManualSteps", () => {
  it("PermissionSet (added) → 2 件 (assignment + fieldPermissions 確認)", () => {
    const summary = buildSummary([
      {
        type: deterministic("permission"),
        changes: [
          {
            entity: deterministic("RiskOps"),
            changeKind: deterministic("added"),
            scopeSize: deterministic("small"),
            affectedEntities: deterministic([]),
            reviewPoints: ai([], aiMeta),
            manualStepsRequired: ai(true, aiMeta),
            businessImpactHint: ai("", aiMeta),
          },
        ],
      },
    ]);
    const steps = extractManualSteps(summary);
    expect(steps).toHaveLength(2);
    expect(steps[0]?.title.value).toContain("assignment");
    expect(steps[0]?.category.value).toBe("post_release");
    expect(steps[1]?.title.value).toContain("fieldPermissions");
    expect(steps[1]?.category.value).toBe("pre_release");
  });

  it("CustomField (data_model added) で FLS チェック step が出る", () => {
    const summary = buildSummary([
      {
        type: deterministic("data_model"),
        changes: [
          {
            entity: deterministic("Account.Risk_Tier__c"),
            changeKind: deterministic("added"),
            scopeSize: deterministic("small"),
            affectedEntities: deterministic([]),
            reviewPoints: ai([], aiMeta),
            manualStepsRequired: ai(true, aiMeta),
            businessImpactHint: ai("", aiMeta),
          },
        ],
      },
    ]);
    const steps = extractManualSteps(summary);
    const fls = steps.find((s) => s.title.value.includes("Field-Level Security"));
    expect(fls).toBeDefined();
    expect(fls?.category.value).toBe("pre_release");
    expect(fls?.target.value).toBe("Account.Risk_Tier__c");
  });

  it("data_model + reviewPoints に picklist 言及 → 既存レコード補正 step", () => {
    const summary = buildSummary([
      {
        type: deterministic("data_model"),
        changes: [
          {
            entity: deterministic("Account.Risk_Tier__c"),
            changeKind: deterministic("added"),
            scopeSize: deterministic("small"),
            affectedEntities: deterministic([]),
            reviewPoints: ai(["restricted picklist の挙動を確認"], aiMeta),
            manualStepsRequired: ai(true, aiMeta),
            businessImpactHint: ai("", aiMeta),
          },
        ],
      },
    ]);
    const steps = extractManualSteps(summary);
    const backfill = steps.find((s) => s.title.value.includes("バックフィル"));
    expect(backfill).toBeDefined();
    expect(backfill?.reversible.value).toBe(false);
  });

  it("automation (modified) → テストカバレッジ確認 step", () => {
    const summary = buildSummary([
      {
        type: deterministic("automation"),
        changes: [
          {
            entity: deterministic("OrderTrigger"),
            changeKind: deterministic("modified"),
            scopeSize: deterministic("small"),
            affectedEntities: deterministic([]),
            reviewPoints: ai([], aiMeta),
            manualStepsRequired: ai(true, aiMeta),
            businessImpactHint: ai("", aiMeta),
          },
        ],
      },
    ]);
    const steps = extractManualSteps(summary);
    expect(steps[0]?.title.value).toContain("テスト");
    expect(steps[0]?.category.value).toBe("pre_release");
  });

  it("該当パターン無しなら空配列", () => {
    const summary = buildSummary([
      {
        type: deterministic("ui"),
        changes: [
          {
            entity: deterministic("MyLayout"),
            changeKind: deterministic("modified"),
            scopeSize: deterministic("small"),
            affectedEntities: deterministic([]),
            reviewPoints: ai([], aiMeta),
            manualStepsRequired: ai(false, aiMeta),
            businessImpactHint: ai("", aiMeta),
          },
        ],
      },
    ]);
    expect(extractManualSteps(summary)).toEqual([]);
  });
});
