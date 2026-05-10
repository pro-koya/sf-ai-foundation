import { describe, expect, it } from "vitest";
import { extractSharingRules } from "../../../src/graph/extractors/sharing-rules.js";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<SharingRules xmlns="http://soap.sforce.com/2006/04/metadata">
    <sharingCriteriaRules>
        <fullName>HighValueOrders</fullName>
        <accessLevel>Edit</accessLevel>
        <description>高額受注を経理マネージャに共有</description>
        <label>高額受注共有</label>
        <sharedTo>
            <role>FinanceManager</role>
        </sharedTo>
        <criteriaItems>
            <field>Order__c.Net_Amount__c</field>
            <operation>greaterThan</operation>
            <value>1000000</value>
        </criteriaItems>
        <criteriaItems>
            <field>Order__c.Status__c</field>
            <operation>equals</operation>
            <value>Approved</value>
        </criteriaItems>
        <booleanFilter>1 AND 2</booleanFilter>
    </sharingCriteriaRules>
    <sharingOwnerRules>
        <fullName>SalesToManager</fullName>
        <accessLevel>Read</accessLevel>
        <label>営業 → マネージャ参照</label>
        <sharedFrom>
            <role>SalesRep</role>
        </sharedFrom>
        <sharedTo>
            <roleAndSubordinates>SalesManager</roleAndSubordinates>
        </sharedTo>
    </sharingOwnerRules>
</SharingRules>`;

describe("extractSharingRules", () => {
  const ctx = {
    descriptor: {
      type: "SharingRules",
      fullyQualifiedName: "Order__c",
      sourcePath: "force-app/main/default/sharingRules/Order__c.sharingRules-meta.xml",
      contentHash: "h",
    },
    content: SAMPLE,
    projectRoot: ".",
  };

  it("criteriaBased / ownerBased 双方を返す", () => {
    const rules = extractSharingRules(ctx);
    expect(rules.length).toBe(2);
    const criteria = rules.find((r) => r.kind === "criteriaBased");
    const owner = rules.find((r) => r.kind === "ownerBased");
    expect(criteria).toBeDefined();
    expect(owner).toBeDefined();
  });

  it("criteriaItems / sharedTo / booleanFilter を取れる", () => {
    const rules = extractSharingRules(ctx);
    const c = rules.find((r) => r.kind === "criteriaBased");
    expect(c?.criteriaItems.length).toBe(2);
    expect(c?.criteriaBooleanFilter).toBe("1 AND 2");
    expect(c?.sharedTo.type).toBe("role");
    expect(c?.sharedTo.target).toBe("FinanceManager");
    expect(c?.accessLevel).toBe("Edit");
  });

  it("ownerSource を取れる", () => {
    const rules = extractSharingRules(ctx);
    const o = rules.find((r) => r.kind === "ownerBased");
    expect(o?.ownerSource).toBe("role:SalesRep");
    expect(o?.sharedTo.type).toBe("roleAndSubordinates");
    expect(o?.sharedTo.target).toBe("SalesManager");
  });

  it("FQN は <Object>.<RuleName>", () => {
    const rules = extractSharingRules(ctx);
    expect(rules[0]?.fullyQualifiedName).toContain("Order__c.");
  });
});
