import { describe, expect, it } from "vitest";
import { extractFlowBody } from "../../../src/graph/extractors/flow-body.js";
import { buildFlowFlowchart } from "../../../src/render/flow-flowchart.js";

describe("buildFlowFlowchart", () => {
  it("空 body は (要素なし) を返す", () => {
    const r = buildFlowFlowchart({
      elements: [],
      subflows: [],
      recordObjects: [],
      actionCalls: [],
      edges: [],
    });
    expect(r.mermaid).toContain("flowchart TD");
    expect(r.mermaid).toContain("(要素なし)");
    expect(r.details).toEqual([]);
  });

  it("各要素に対応する details が返る", () => {
    const body = {
      elements: [
        { name: "Lookup_Order", kind: "recordLookup" as const, label: "Order を取得", target: "Order__c" },
        { name: "Is_Approved", kind: "decision" as const },
      ],
      subflows: [],
      recordObjects: [],
      actionCalls: [],
      edges: [],
    };
    const r = buildFlowFlowchart(body);
    expect(r.details.length).toBe(2);
    expect(r.details[0]?.id).toBe("e_Lookup_Order");
    expect(r.details[0]?.fullText).toContain("Order を取得");
  });

  it("decision の rule / default を分岐ラベル付きで描画する", () => {
    const body = extractFlowBody({
      start: { connector: { targetReference: "Lookup_Order" } },
      recordLookups: [
        {
          name: "Lookup_Order",
          label: "Lookup",
          object: "Order__c",
          connector: { targetReference: "Is_VIP" },
        },
      ],
      decisions: [
        {
          name: "Is_VIP",
          rules: [{ name: "yes", label: "VIP", connector: { targetReference: "Send_Notif" } }],
          defaultConnector: { targetReference: "Done" },
          defaultConnectorLabel: "Not VIP",
        },
      ],
      actionCalls: [{ name: "Send_Notif", actionName: "emailAlert" }],
      assignments: [{ name: "Done" }],
    });
    const m = buildFlowFlowchart(body).mermaid;
    expect(m).toContain("__start__([Start])");
    expect(m).toContain("|VIP|");
    expect(m).toContain("|Not VIP|");
    expect(m).toContain("e_Is_VIP");
  });

  it("fault は点線エッジで描画される", () => {
    const body = extractFlowBody({
      actionCalls: [
        {
          name: "Call_Api",
          actionName: "x",
          connector: { targetReference: "Done" },
          faultConnector: { targetReference: "Handle_Fault" },
        },
      ],
      assignments: [{ name: "Done" }, { name: "Handle_Fault" }],
    });
    const m = buildFlowFlowchart(body).mermaid;
    expect(m).toContain("-.->|fault|");
  });

  it("loop の next / noMore の双方を出す", () => {
    const body = extractFlowBody({
      loops: [
        {
          name: "Loop1",
          nextValueConnector: { targetReference: "Body" },
          noMoreValuesConnector: { targetReference: "After" },
        },
      ],
      assignments: [{ name: "Body" }, { name: "After" }],
    });
    const m = buildFlowFlowchart(body).mermaid;
    expect(m).toContain("|next value|");
    expect(m).toContain("|no more values|");
  });
});
