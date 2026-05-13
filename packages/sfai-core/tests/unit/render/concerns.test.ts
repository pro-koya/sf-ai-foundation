import { describe, expect, it } from "vitest";
import {
  concernsForApex,
  concernsForFlow,
  concernsForTrigger,
} from "../../../src/render/concerns.js";
import type { ApexClass, ApexTrigger, Flow, KnowledgeGraph } from "../../../src/types/graph.js";

const baseGraph: KnowledgeGraph = {
  meta: {
    sfaiVersion: "test",
    builtAt: "2026-05-08T00:00:00Z",
    sourceAdapter: "local",
    salesforceApiVersion: "62.0",
    sourceHash: "sha256:test",
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

const noBody = {
  methods: [],
  soqlQueries: [],
  dmlOperations: [],
  classReferences: [],
  classAnnotations: [],
  hasTryCatch: false,
  hasCallout: false,
};

describe("concernsForApex", () => {
  it("コールアウトかつ try/catch 無しを HIGH にする", () => {
    const cls: ApexClass = {
      fullyQualifiedName: "C",
      apiVersion: "62.0",
      isTest: false,
      sourcePath: "x.cls",
      contentHash: "h",
      body: { ...noBody, hasCallout: true },
    };
    const out = concernsForApex(cls, baseGraph);
    expect(out.some((c) => c.severity === "HIGH")).toBe(true);
  });

  it("テストクラスが見つからないと MEDIUM", () => {
    const cls: ApexClass = {
      fullyQualifiedName: "AccountService",
      apiVersion: "62.0",
      isTest: false,
      sourcePath: "x.cls",
      contentHash: "h",
    };
    const out = concernsForApex(cls, baseGraph);
    expect(out.some((c) => c.title.includes("テストクラス"))).toBe(true);
  });

  it("対応するテストクラスがあればテスト不在指摘は出ない", () => {
    const cls: ApexClass = {
      fullyQualifiedName: "AccountService",
      apiVersion: "62.0",
      isTest: false,
      sourcePath: "x.cls",
      contentHash: "h",
    };
    const test: ApexClass = {
      fullyQualifiedName: "AccountServiceTest",
      apiVersion: "62.0",
      isTest: true,
      sourcePath: "y.cls",
      contentHash: "h",
    };
    const g = { ...baseGraph, apexClasses: [cls, test] };
    const out = concernsForApex(cls, g);
    expect(out.some((c) => c.title.includes("テストクラス"))).toBe(false);
  });
});

describe("concernsForTrigger", () => {
  it("同一オブジェクトに複数トリガーで HIGH", () => {
    const t1: ApexTrigger = {
      fullyQualifiedName: "T1",
      object: "Account",
      events: ["beforeInsert"],
      apiVersion: "62.0",
      sourcePath: "x.trigger",
      contentHash: "h",
    };
    const t2: ApexTrigger = { ...t1, fullyQualifiedName: "T2" };
    const g = { ...baseGraph, apexTriggers: [t1, t2] };
    const out = concernsForTrigger(t1, g);
    expect(out.some((c) => c.severity === "HIGH")).toBe(true);
  });
});

describe("concernsForFlow", () => {
  it("description 未設定で INFO", () => {
    const f: Flow = {
      fullyQualifiedName: "F",
      type: "AutoLaunchedFlow",
      status: "Active",
      sourcePath: "x.flow-meta.xml",
      contentHash: "h",
    };
    const out = concernsForFlow(f);
    expect(out.some((c) => c.title.includes("description"))).toBe(true);
  });
});
