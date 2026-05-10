import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractVisualforceComponent } from "../../../src/graph/extractors/visualforce-component.js";

let tmpRoot: string;
let compDir: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "sfai-vfc-"));
  compDir = join(tmpRoot, "force-app", "main", "default", "components");
  mkdirSync(compDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const META_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ApexComponent xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <description>請求明細行コンポーネント</description>
    <label>InvoiceLine</label>
</ApexComponent>`;

const MARKUP = `<apex:component controller="InvoiceLineController" access="global">
    <apex:attribute name="lineNumber" type="Integer" required="true" description="行番号" />
    <apex:attribute name="amount" type="Decimal" description="金額" />
    <apex:outputText value="{!lineNumber}" />
    <apex:outputText value="{!amount}" />
</apex:component>`;

describe("extractVisualforceComponent", () => {
  it("controller / attributes / markup タグ件数を抽出する", () => {
    writeFileSync(join(compDir, "InvoiceLine.component-meta.xml"), META_XML);
    writeFileSync(join(compDir, "InvoiceLine.component"), MARKUP);

    const sourcePath = relative(tmpRoot, join(compDir, "InvoiceLine.component-meta.xml"));

    const out = extractVisualforceComponent({
      descriptor: {
        type: "VisualforceComponent",
        fullyQualifiedName: "InvoiceLine",
        sourcePath,
        contentHash: "h",
      },
      content: META_XML,
      projectRoot: tmpRoot,
    });

    expect(out?.fullyQualifiedName).toBe("InvoiceLine");
    expect(out?.controller).toBe("InvoiceLineController");
    expect(out?.attributes.length).toBe(2);

    const lineNumberAttr = out?.attributes.find((a) => a.name === "lineNumber");
    expect(lineNumberAttr?.type).toBe("Integer");
    expect(lineNumberAttr?.required).toBe(true);
    expect(lineNumberAttr?.description).toBe("行番号");

    const amountAttr = out?.attributes.find((a) => a.name === "amount");
    expect(amountAttr?.required).toBe(undefined);

    expect(out?.markupCounts.find((m) => m.tag === "apex:outputText")?.count).toBe(2);
    expect(out?.hasMarkup).toBe(true);
  });

  it("markup なしならベストエフォートで attributes 空", () => {
    writeFileSync(join(compDir, "Empty.component-meta.xml"), META_XML);

    const sourcePath = relative(tmpRoot, join(compDir, "Empty.component-meta.xml"));

    const out = extractVisualforceComponent({
      descriptor: {
        type: "VisualforceComponent",
        fullyQualifiedName: "Empty",
        sourcePath,
        contentHash: "h",
      },
      content: META_XML,
      projectRoot: tmpRoot,
    });

    expect(out?.hasMarkup).toBe(false);
    expect(out?.attributes).toEqual([]);
  });
});
