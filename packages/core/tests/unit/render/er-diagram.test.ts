import { describe, expect, it } from "vitest";
import { buildErDiagram } from "../../../src/render/er-diagram.js";
import type { Field, KnowledgeGraph, SObject } from "../../../src/types/graph.js";

const META: KnowledgeGraph["meta"] = {
  yohakuVersion: "test",
  builtAt: "2026-05-08T00:00:00Z",
  sourceAdapter: "local",
  salesforceApiVersion: "62.0",
  sourceHash: "h",
};

const baseEmpty: Omit<KnowledgeGraph, "objects" | "fields"> = {
  meta: META,
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

function makeObject(name: string): SObject {
  return {
    fullyQualifiedName: name,
    label: name,
    isCustom: name.endsWith("__c"),
    sourcePath: `objects/${name}/${name}.object-meta.xml`,
    contentHash: "h",
  };
}

function makeField(
  object: string,
  fieldName: string,
  type: string,
  referenceTo: readonly string[],
): Field {
  return {
    fullyQualifiedName: `${object}.${fieldName}`,
    object,
    type,
    isCustom: fieldName.endsWith("__c"),
    referenceTo,
    sourcePath: `objects/${object}/fields/${fieldName}.field-meta.xml`,
    contentHash: "h",
  };
}

describe("buildErDiagram", () => {
  it("Master-Detail と Lookup を区別して描画する", () => {
    const graph: KnowledgeGraph = {
      ...baseEmpty,
      objects: [makeObject("Order__c"), makeObject("OrderLine__c"), makeObject("Account")],
      fields: [
        makeField("OrderLine__c", "Order__c", "MasterDetail", ["Order__c"]),
        makeField("Order__c", "Account__c", "Lookup", ["Account"]),
      ],
    };

    const er = buildErDiagram(graph);
    expect(er.startsWith("erDiagram")).toBe(true);
    // Master-Detail は ||--|{
    expect(er).toMatch(/Order__c \|\|--\|\{ OrderLine__c/);
    // Lookup は ||--o{
    expect(er).toMatch(/Account \|\|--o\{ Order__c/);
  });

  it("referenceTo が無いフィールドのみなら空文字を返す", () => {
    const graph: KnowledgeGraph = {
      ...baseEmpty,
      objects: [makeObject("Order__c")],
      fields: [makeField("Order__c", "Name", "Text", [])],
    };

    expect(buildErDiagram(graph)).toBe("");
  });

  it("参照先の標準オブジェクト (objects に未登録) も stub として描画する", () => {
    const graph: KnowledgeGraph = {
      ...baseEmpty,
      objects: [makeObject("Order__c")],
      fields: [makeField("Order__c", "Owner__c", "Lookup", ["User"])],
    };

    const er = buildErDiagram(graph);
    expect(er).toContain("User {");
    expect(er).toContain("Order__c");
    expect(er).toMatch(/User \|\|--o\{ Order__c/);
  });
});
