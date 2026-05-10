import { describe, expect, it } from "vitest";
import { buildTriggerProcessingSummary } from "../../../src/render/trigger-processing-summary.js";
import type { ApexTrigger } from "../../../src/types/graph.js";

describe("buildTriggerProcessingSummary", () => {
  it("controlFlows から SOQL/DML/分岐/ループ/委譲先を集計する", () => {
    const trg: ApexTrigger = {
      fullyQualifiedName: "OrderTrigger",
      object: "Order__c",
      events: ["beforeInsert", "afterUpdate"],
      apiVersion: "62.0",
      sourcePath: "p",
      contentHash: "h",
      body: {
        methods: [],
        soqlQueries: [],
        dmlOperations: [],
        classReferences: [
          { className: "OrderHandler", memberName: "<new>" },
          { className: "OrderHandler", memberName: "handle" },
        ],
        classAnnotations: [],
        hasTryCatch: true,
        hasCallout: false,
        controlFlows: [
          {
            methodName: "<trigger>",
            signature: "trigger OrderTrigger on Order__c",
            nodes: [
              {
                kind: "if",
                condition: "Trigger.isInsert",
                thenNodes: [
                  { kind: "soql", raw: "SELECT Id FROM Account", primaryObject: "Account" },
                  {
                    kind: "for",
                    header: "Order__c o : Trigger.new",
                    body: [
                      { kind: "stmt", text: "OrderHandler.handle(o);" },
                    ],
                  },
                ],
                elseNodes: [],
              },
              { kind: "dml", verb: "update", target: "ordersToUpdate", viaDatabaseClass: false },
            ],
          },
        ],
      },
    };

    const summary = buildTriggerProcessingSummary(trg);
    expect(summary.events).toEqual(["beforeInsert", "afterUpdate"]);
    expect(summary.soqlCount).toBe(1);
    expect(summary.dmlCount).toBe(1);
    expect(summary.branchCount).toBe(1);
    expect(summary.loopCount).toBe(1);
    expect(summary.delegations).toEqual(["OrderHandler"]);
  });

  it("body が無いトリガーはゼロを返す", () => {
    const trg: ApexTrigger = {
      fullyQualifiedName: "Empty",
      object: "Order__c",
      events: ["beforeInsert"],
      apiVersion: "62.0",
      sourcePath: "p",
      contentHash: "h",
    };
    const s = buildTriggerProcessingSummary(trg);
    expect(s.soqlCount).toBe(0);
    expect(s.dmlCount).toBe(0);
    expect(s.delegations).toEqual([]);
  });
});
