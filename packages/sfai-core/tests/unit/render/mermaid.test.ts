import { describe, expect, it } from "vitest";
import {
  buildSystemOverviewMermaid,
  buildTriggerMermaid,
} from "../../../src/render/mermaid.js";
import type { ApexClass, ApexTrigger, KnowledgeGraph } from "../../../src/types/graph.js";

const baseMeta: KnowledgeGraph["meta"] = {
  sfaiVersion: "test",
  builtAt: "2026-05-08T00:00:00Z",
  sourceAdapter: "local",
  salesforceApiVersion: "62.0",
  sourceHash: "sha256:test",
};

const helperClass: ApexClass = {
  fullyQualifiedName: "AccountService",
  apiVersion: "62.0",
  isTest: false,
  sourcePath: "force-app/.../AccountService.cls",
  contentHash: "sha256:helper",
  body: {
    methods: [],
    soqlQueries: [{ raw: "SELECT Id FROM Account", primaryObject: "Account" }],
    dmlOperations: [{ kind: "insert", target: "Account", viaDatabaseClass: false }],
    classReferences: [],
    classAnnotations: [],
    hasTryCatch: false,
    hasCallout: false,
  },
};

const trigger: ApexTrigger = {
  fullyQualifiedName: "AccountTrigger",
  object: "Account",
  events: ["beforeInsert", "afterInsert"],
  apiVersion: "62.0",
  sourcePath: "force-app/.../AccountTrigger.trigger",
  contentHash: "sha256:trigger",
  body: {
    methods: [],
    soqlQueries: [],
    dmlOperations: [],
    classReferences: [{ className: "AccountService", memberName: "doInsert" }],
    classAnnotations: [],
    hasTryCatch: false,
    hasCallout: false,
  },
};

const graph: KnowledgeGraph = {
  meta: baseMeta,
  objects: [
    {
      fullyQualifiedName: "Account",
      label: "Account",
      isCustom: false,
      sourcePath: "force-app/.../Account.object-meta.xml",
      contentHash: "sha256:obj",
    },
  ],
  fields: [],
  validationRules: [],
  flows: [],
  apexClasses: [helperClass],
  apexTriggers: [trigger],
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

describe("buildTriggerMermaid", () => {
  it("起点ノードと参照クラスを mermaid に変換する", () => {
    const m = buildTriggerMermaid(trigger, graph);
    expect(m.startsWith("flowchart LR")).toBe(true);
    expect(m).toContain("Trigger_AccountTrigger");
    expect(m).toContain("Class_AccountService");
    expect(m).toContain("on beforeInsert/afterInsert");
  });

  it("呼び出し先クラスの SOQL/DML 対象オブジェクトをノードとして追加する", () => {
    const m = buildTriggerMermaid(trigger, graph);
    expect(m).toContain("Obj_Account");
    expect(m).toContain("SOQL/DML");
  });
});

describe("buildSystemOverviewMermaid", () => {
  it("空グラフでも壊れない", () => {
    const m = buildSystemOverviewMermaid({
      ...graph,
      apexTriggers: [],
      apexClasses: [],
      flows: [],
    });
    expect(m).toContain("flowchart LR");
    expect(m).toContain("Empty");
  });

  it("トリガーとオブジェクトの関係を出す", () => {
    const m = buildSystemOverviewMermaid(graph);
    expect(m).toContain("Trigger_AccountTrigger");
    expect(m).toContain("Obj_Account");
  });
});
