import { describe, expect, it } from "vitest";
import { buildMethodSummaryTable } from "../../../src/render/method-summary-table.js";
import { buildIntraClassCallGraph } from "../../../src/render/intra-class-call-graph.js";
import type { ApexClass } from "../../../src/types/graph.js";

const cls: ApexClass = {
  fullyQualifiedName: "AccountBalanceService",
  apiVersion: "62.0",
  isTest: false,
  sourcePath: "AccountBalanceService.cls",
  contentHash: "h",
  body: {
    methods: [
      {
        name: "recalculate",
        visibility: "public",
        isStatic: true,
        returnType: "void",
        parameters: "Set<Id> accountIds",
        annotations: [],
      },
      {
        name: "computeRiskTier",
        visibility: "private",
        isStatic: true,
        returnType: "String",
        parameters: "Decimal balance",
        annotations: [],
      },
    ],
    soqlQueries: [],
    dmlOperations: [],
    classReferences: [],
    classAnnotations: [],
    hasTryCatch: false,
    hasCallout: false,
    controlFlows: [
      {
        methodName: "recalculate",
        signature: "public static void recalculate(Set<Id> accountIds)",
        nodes: [
          { kind: "soql", raw: "SELECT Id FROM Invoice__c", primaryObject: "Invoice__c" },
          {
            kind: "for",
            header: "Invoice__c inv : invoices",
            body: [
              { kind: "stmt", text: "Decimal tier = computeRiskTier(inv.Amount__c);" },
              { kind: "stmt", text: "System.debug(tier);" },
            ],
          },
          {
            kind: "if",
            condition: "accountIds.isEmpty()",
            thenNodes: [{ kind: "return", expression: "" }],
            elseNodes: [
              { kind: "dml", verb: "update", target: "accountsToUpdate", viaDatabaseClass: false },
            ],
          },
        ],
      },
      {
        methodName: "computeRiskTier",
        signature: "private static String computeRiskTier(Decimal balance)",
        nodes: [
          {
            kind: "if",
            condition: "balance > 1000000",
            thenNodes: [{ kind: "return", expression: "'HIGH'" }],
            elseNodes: [{ kind: "return", expression: "'LOW'" }],
          },
        ],
      },
    ],
  },
};

describe("buildMethodSummaryTable", () => {
  it("各メソッドの SOQL/DML/分岐/ループ/呼び出し件数を集計する", () => {
    const rows = buildMethodSummaryTable(cls);
    expect(rows.length).toBe(2);

    const recalc = rows.find((r) => r.methodName === "recalculate");
    expect(recalc?.soqlCount).toBe(1);
    expect(recalc?.dmlCount).toBe(1);
    expect(recalc?.branchCount).toBe(1);
    expect(recalc?.loopCount).toBe(1);
    expect(recalc?.tryCount).toBe(0);
    expect(recalc?.intraClassCalls).toContain("computeRiskTier");
    expect(recalc?.externalCalls).toContain("System.debug");

    const compute = rows.find((r) => r.methodName === "computeRiskTier");
    expect(compute?.branchCount).toBe(1);
    expect(compute?.intraClassCalls).toEqual([]);
  });

  it("body が無いクラスは空配列を返す", () => {
    const empty: ApexClass = {
      fullyQualifiedName: "Empty",
      apiVersion: "62.0",
      isTest: false,
      sourcePath: "p",
      contentHash: "h",
    };
    expect(buildMethodSummaryTable(empty)).toEqual([]);
  });
});

describe("buildIntraClassCallGraph", () => {
  it("自クラス内呼び出しがあれば flowchart を返す", () => {
    const rows = buildMethodSummaryTable(cls);
    const mermaid = buildIntraClassCallGraph(rows);
    expect(mermaid.startsWith("flowchart LR")).toBe(true);
    expect(mermaid).toContain("recalculate --> computeRiskTier");
    expect(mermaid).toContain("recalculate[\"recalculate (static)\"]");
  });

  it("呼び出しが無ければ空文字を返す", () => {
    const rowsNoCalls = [
      {
        methodName: "isolated",
        visibility: "public",
        isStatic: false,
        returnType: "void",
        parameters: "",
        soqlCount: 0,
        dmlCount: 0,
        branchCount: 0,
        loopCount: 0,
        tryCount: 0,
        intraClassCalls: [],
        externalCalls: [],
      },
    ];
    expect(buildIntraClassCallGraph(rowsNoCalls)).toBe("");
  });
});
