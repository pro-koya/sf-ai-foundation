import { describe, expect, it } from "vitest";
import { extractCustomApplication } from "../../../src/graph/extractors/custom-application.js";

const APP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CustomApplication xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Sales Console</label>
    <description>営業向けコンソール</description>
    <navType>Console</navType>
    <formFactors>Large</formFactors>
    <formFactors>Small</formFactors>
    <tabs>standard-Account</tabs>
    <tabs>standard-Opportunity</tabs>
    <tabs>Order__c</tabs>
    <utilityBar>SalesConsole_UtilityBar</utilityBar>
    <brand>
        <headerColor>#0070d2</headerColor>
    </brand>
</CustomApplication>`;

describe("extractCustomApplication", () => {
  it("Lightning App のラベル / navType / tabs / formFactors / brandColor を抽出する", () => {
    const out = extractCustomApplication({
      descriptor: {
        type: "CustomApplication",
        fullyQualifiedName: "SalesConsole",
        sourcePath: "force-app/main/default/applications/SalesConsole.app-meta.xml",
        contentHash: "h",
      },
      content: APP_XML,
      projectRoot: ".",
    });

    expect(out?.fullyQualifiedName).toBe("SalesConsole");
    expect(out?.label).toBe("Sales Console");
    expect(out?.navType).toBe("Console");
    expect(out?.formFactors).toEqual(["Large", "Small"]);
    expect(out?.tabs).toEqual(["Order__c", "standard-Account", "standard-Opportunity"]);
    expect(out?.utilityBar).toBe("SalesConsole_UtilityBar");
    expect(out?.brandColor).toBe("#0070d2");
    expect(out?.description).toBe("営業向けコンソール");
  });

  it("最小構成 (label のみ) でも抽出できる", () => {
    const xml = `<?xml version="1.0"?>
<CustomApplication xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Minimal</label>
</CustomApplication>`;

    const out = extractCustomApplication({
      descriptor: {
        type: "CustomApplication",
        fullyQualifiedName: "Minimal",
        sourcePath: "p",
        contentHash: "h",
      },
      content: xml,
      projectRoot: ".",
    });

    expect(out?.label).toBe("Minimal");
    expect(out?.tabs).toEqual([]);
    expect(out?.formFactors).toEqual([]);
    expect(out?.navType).toBeUndefined();
  });
});
