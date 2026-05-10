import { describe, expect, it } from "vitest";
import { extractApprovalProcess } from "../../../src/graph/extractors/approval-process.js";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<ApprovalProcess xmlns="http://soap.sforce.com/2006/04/metadata">
    <active>true</active>
    <description>受注承認</description>
    <label>受注承認</label>
    <recordEditability>AdminOrCurrentApprover</recordEditability>
    <entryCriteria>
        <criteriaItems>
            <field>Order__c.Net_Amount__c</field>
            <operation>greaterThan</operation>
            <value>500000</value>
        </criteriaItems>
    </entryCriteria>
    <approvalStep>
        <name>SalesManagerApproval</name>
        <label>営業マネージャ承認</label>
        <description>事業判断</description>
        <allowDelegate>true</allowDelegate>
        <assignedApprover>
            <approver>
                <type>userHierarchyField</type>
                <field>Manager</field>
            </approver>
        </assignedApprover>
        <ifCriteriaNotMet>GoToNextStep</ifCriteriaNotMet>
    </approvalStep>
    <approvalStep>
        <name>FinanceManagerApproval</name>
        <label>経理マネージャ承認</label>
        <allowDelegate>false</allowDelegate>
        <assignedApprover>
            <approver>
                <type>queue</type>
                <queue>FinanceApprovers</queue>
            </approver>
        </assignedApprover>
        <ifCriteriaNotMet>RejectRequest</ifCriteriaNotMet>
    </approvalStep>
    <finalApprovalActions>
        <action>
            <name>Set_Status_Approved</name>
            <type>FieldUpdate</type>
        </action>
    </finalApprovalActions>
    <finalRejectionActions>
        <action>
            <name>Set_Status_Rejected</name>
            <type>FieldUpdate</type>
        </action>
    </finalRejectionActions>
</ApprovalProcess>`;

describe("extractApprovalProcess", () => {
  const ctx = {
    descriptor: {
      type: "ApprovalProcess",
      fullyQualifiedName: "Order__c.HighValueApproval",
      sourcePath: "force-app/main/default/approvalProcesses/Order__c.HighValueApproval.approvalProcess-meta.xml",
      contentHash: "h",
    },
    content: SAMPLE,
    projectRoot: ".",
  };

  it("基本属性を取れる", () => {
    const ap = extractApprovalProcess(ctx);
    expect(ap?.fullyQualifiedName).toBe("Order__c.HighValueApproval");
    expect(ap?.object).toBe("Order__c");
    expect(ap?.label).toBe("受注承認");
    expect(ap?.active).toBe(true);
  });

  it("entryCriteria を取れる", () => {
    const ap = extractApprovalProcess(ctx);
    expect(ap?.entryCriteria.length).toBe(1);
    expect(ap?.entryCriteria[0]?.field).toBe("Order__c.Net_Amount__c");
    expect(ap?.entryCriteria[0]?.operation).toBe("greaterThan");
  });

  it("複数の approvalStep を取れる", () => {
    const ap = extractApprovalProcess(ctx);
    expect(ap?.steps.length).toBe(2);
    expect(ap?.steps[0]?.name).toBe("SalesManagerApproval");
    expect(ap?.steps[0]?.approverType).toBe("userHierarchyField");
    expect(ap?.steps[0]?.approverDetail).toBe("Manager");
    expect(ap?.steps[0]?.allowDelegate).toBe(true);
    expect(ap?.steps[0]?.ifCriteriaNotMet).toBe("GoToNextStep");
    expect(ap?.steps[1]?.approverType).toBe("queue");
    expect(ap?.steps[1]?.approverDetail).toBe("FinanceApprovers");
    expect(ap?.steps[1]?.ifCriteriaNotMet).toBe("RejectRequest");
  });

  it("最終承認・却下のアクションを取れる", () => {
    const ap = extractApprovalProcess(ctx);
    expect(ap?.finalApprovalActions[0]?.name).toBe("Set_Status_Approved");
    expect(ap?.finalRejectionActions[0]?.name).toBe("Set_Status_Rejected");
  });
});
