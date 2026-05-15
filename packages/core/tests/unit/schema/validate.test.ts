import { describe, expect, it } from "vitest";
import type { KnowledgeGraph } from "../../../src/index.js";
import {
  GraphSchemaValidationError,
  loadGraphSchema,
  validateGraph,
} from "../../../src/schema/validate.js";

describe("validateGraph", () => {
  const minimalGraph: KnowledgeGraph = {
    meta: {
      yohakuVersion: "0.0.1",
      builtAt: "2026-05-07T00:00:00Z",
      sourceAdapter: "local",
      salesforceApiVersion: "62.0",
      sourceHash: "sha256:abc",
    },
    objects: [],
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

  it("最小グラフがスキーマ適合", () => {
    expect(() => validateGraph(minimalGraph)).not.toThrow();
  });

  it("meta.sourceAdapter が enum 外なら拒否", () => {
    const bad = { ...minimalGraph, meta: { ...minimalGraph.meta, sourceAdapter: "invalid" } };
    expect(() => validateGraph(bad)).toThrow(GraphSchemaValidationError);
  });

  it("loadGraphSchema が JSON Schema を返す", () => {
    const schema = loadGraphSchema();
    expect(schema.title).toBe("yohakuforce Knowledge Graph");
  });
});
