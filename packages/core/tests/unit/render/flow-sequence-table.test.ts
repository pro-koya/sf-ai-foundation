import { describe, expect, it } from "vitest";
import { buildFlowSequenceTable } from "../../../src/render/flow-sequence-table.js";
import type { Flow } from "../../../src/types/graph.js";

const flow: Flow = {
  fullyQualifiedName: "Order_Approval",
  type: "RecordTriggered",
  status: "Active",
  triggeringObject: "Order__c",
  sourcePath: "p",
  contentHash: "h",
  body: {
    elements: [
      { name: "GetAccount", kind: "recordLookup", target: "Account" },
      { name: "CheckStatus", kind: "decision" },
      { name: "UpdateOrder", kind: "recordUpdate", target: "Order__c" },
      { name: "SendEmail", kind: "actionCall", target: "EmailAlert.Send" },
    ],
    subflows: [],
    recordObjects: ["Account", "Order__c"],
    actionCalls: ["EmailAlert.Send"],
    edges: [
      { from: "GetAccount", to: "CheckStatus", kind: "next" },
      { from: "CheckStatus", to: "UpdateOrder", kind: "rule", label: "approved" },
      { from: "UpdateOrder", to: "SendEmail", kind: "next" },
    ],
    startTarget: "GetAccount",
  },
};

describe("buildFlowSequenceTable", () => {
  it("startTarget から edges を辿って実行順に並べる", () => {
    const rows = buildFlowSequenceTable(flow);
    expect(rows.length).toBe(4);
    expect(rows.map((r) => r.name)).toEqual([
      "GetAccount",
      "CheckStatus",
      "UpdateOrder",
      "SendEmail",
    ]);
    expect(rows[0]?.summary).toContain("`Account` を取得");
    expect(rows[1]?.summary).toBe("条件分岐");
    expect(rows[2]?.summary).toContain("`Order__c` を更新");
    expect(rows[3]?.summary).toContain("`EmailAlert.Send`");
    expect(rows[0]?.order).toBe(1);
    expect(rows[3]?.order).toBe(4);
  });

  it("body が無ければ空配列", () => {
    const noBody: Flow = {
      fullyQualifiedName: "X",
      type: "AutoLaunchedFlow",
      status: "Active",
      sourcePath: "p",
      contentHash: "h",
    };
    expect(buildFlowSequenceTable(noBody)).toEqual([]);
  });

  it("edges に乗らない孤立要素も末尾に含める", () => {
    const flowWithIsolated: Flow = {
      ...flow,
      body: {
        elements: [
          { name: "Main", kind: "recordLookup", target: "Account" },
          { name: "Orphan", kind: "assignment" },
        ],
        subflows: [],
        recordObjects: [],
        actionCalls: [],
        edges: [],
        startTarget: "Main",
      },
    };
    const rows = buildFlowSequenceTable(flowWithIsolated);
    expect(rows.length).toBe(2);
    expect(rows.map((r) => r.name)).toEqual(["Main", "Orphan"]);
  });
});
