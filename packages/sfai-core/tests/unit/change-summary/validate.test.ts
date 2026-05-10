import { describe, expect, it } from "vitest";
import {
  type ChangeSummary,
  ChangeSummaryValidationError,
  ai,
  deterministic,
  human,
  loadChangeSummarySchema,
  validateChangeSummary,
} from "../../../src/change-summary/index.js";

describe("Tracked helpers", () => {
  it("deterministic ヘルパー", () => {
    expect(deterministic("x")).toEqual({ value: "x", source: "deterministic" });
  });
  it("ai ヘルパーは prompt/model/temp を含む", () => {
    expect(ai("hint", { promptHash: "h", model: "claude-sonnet-4-6", temperature: 0 })).toEqual({
      value: "hint",
      source: "ai",
      promptHash: "h",
      model: "claude-sonnet-4-6",
      temperature: 0,
    });
  });
  it("human ヘルパー", () => {
    expect(human(true)).toEqual({ value: true, source: "human" });
  });
});

const minimalSummary: ChangeSummary = {
  id: deterministic("cs-2026-05-07-001"),
  createdAt: deterministic("2026-05-07T00:00:00Z"),
  fromRef: deterministic("main"),
  toRef: deterministic("HEAD"),
  staticAnalysisFindings: deterministic([]),
  categories: [
    {
      type: deterministic("data_model"),
      changes: [
        {
          entity: deterministic("Account.Industry"),
          changeKind: deterministic("modified"),
          scopeSize: deterministic("small"),
          affectedEntities: deterministic([]),
          reviewPoints: ai(["picklist 値が増えたかを確認"], {
            promptHash: "h",
            model: "claude-sonnet-4-6",
            temperature: 0,
          }),
          manualStepsRequired: ai(false, {
            promptHash: "h",
            model: "claude-sonnet-4-6",
            temperature: 0,
          }),
          businessImpactHint: ai("", {
            promptHash: "h",
            model: "claude-sonnet-4-6",
            temperature: 0,
          }),
        },
      ],
    },
  ],
  humanAnnotations: {
    businessContext: human(""),
    customerCommunicationNeeded: human(false),
  },
};

describe("validateChangeSummary", () => {
  it("最小サマリがスキーマ適合", () => {
    expect(() => validateChangeSummary(minimalSummary)).not.toThrow();
  });

  it("source 列を欠くと弾かれる", () => {
    const bad = JSON.parse(JSON.stringify(minimalSummary));
    bad.id = { value: "cs-x" }; // source なし
    expect(() => validateChangeSummary(bad)).toThrow(ChangeSummaryValidationError);
  });

  it("source enum 外は弾かれる", () => {
    const bad = JSON.parse(JSON.stringify(minimalSummary));
    bad.id = { value: "cs-x", source: "unknown" };
    expect(() => validateChangeSummary(bad)).toThrow(ChangeSummaryValidationError);
  });

  it("loadChangeSummarySchema が JSON Schema を返す", () => {
    const schema = loadChangeSummarySchema();
    expect(schema.title).toBe("SF-AI-Foundation Change Summary");
  });
});
