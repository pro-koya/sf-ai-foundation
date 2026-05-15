import { describe, expect, it } from "vitest";
import { extractFlexiPage } from "../../../src/graph/extractors/flexi-page.js";

const RECORD_PAGE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FlexiPage xmlns="http://soap.sforce.com/2006/04/metadata">
    <masterLabel>Order Record Page</masterLabel>
    <type>RecordPage</type>
    <sobjectType>Order__c</sobjectType>
    <pageTemplate>flexipage:recordHomeTemplateDesktop</pageTemplate>
    <flexiPageRegions>
        <name>main</name>
        <type>Region</type>
        <itemInstances>
            <componentInstance>
                <componentName>flexipage:recordHighlights2</componentName>
            </componentInstance>
        </itemInstances>
        <itemInstances>
            <componentInstance>
                <componentName>c:claimDashboard</componentName>
            </componentInstance>
        </itemInstances>
        <itemInstances>
            <fieldInstance>
                <fieldItem>Record.Status__c</fieldItem>
            </fieldInstance>
        </itemInstances>
    </flexiPageRegions>
    <flexiPageRegions>
        <name>sidebar</name>
        <type>Region</type>
        <itemInstances>
            <componentInstance>
                <componentName>flexipage:relatedListContainer</componentName>
            </componentInstance>
        </itemInstances>
    </flexiPageRegions>
</FlexiPage>`;

describe("extractFlexiPage", () => {
  it("Lightning Page のメタ・region・component を取り込む", () => {
    const out = extractFlexiPage({
      descriptor: {
        type: "FlexiPage",
        fullyQualifiedName: "Order_Record_Page",
        sourcePath: "force-app/main/default/flexipages/Order_Record_Page.flexipage-meta.xml",
        contentHash: "h",
      },
      content: RECORD_PAGE_XML,
      projectRoot: ".",
    });

    expect(out?.fullyQualifiedName).toBe("Order_Record_Page");
    expect(out?.type).toBe("RecordPage");
    expect(out?.sobjectType).toBe("Order__c");
    expect(out?.pageTemplate).toBe("flexipage:recordHomeTemplateDesktop");
    expect(out?.masterLabel).toBe("Order Record Page");

    expect(out?.regions.length).toBe(2);
    const main = out?.regions.find((r) => r.name === "main");
    expect(main?.items.length).toBe(3);
    expect(main?.items[0]?.componentName).toBe("flexipage:recordHighlights2");
    expect(main?.items[1]?.componentName).toBe("c:claimDashboard");
    expect(main?.items[2]?.fieldName).toBe("Record.Status__c");

    const sidebar = out?.regions.find((r) => r.name === "sidebar");
    expect(sidebar?.items.length).toBe(1);
    expect(sidebar?.items[0]?.componentName).toBe("flexipage:relatedListContainer");
  });

  it("region なしのページも空配列で返す", () => {
    const xml = `<?xml version="1.0"?>
<FlexiPage xmlns="http://soap.sforce.com/2006/04/metadata">
    <masterLabel>Empty</masterLabel>
    <type>AppPage</type>
</FlexiPage>`;

    const out = extractFlexiPage({
      descriptor: {
        type: "FlexiPage",
        fullyQualifiedName: "Empty",
        sourcePath: "p",
        contentHash: "h",
      },
      content: xml,
      projectRoot: ".",
    });

    expect(out?.type).toBe("AppPage");
    expect(out?.regions).toEqual([]);
  });
});
