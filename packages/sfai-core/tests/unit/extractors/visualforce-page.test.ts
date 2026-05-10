import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractVisualforcePage } from "../../../src/graph/extractors/visualforce-page.js";

let tmpRoot: string;
let pagesDir: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "sfai-vfp-"));
  pagesDir = join(tmpRoot, "force-app", "main", "default", "pages");
  mkdirSync(pagesDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const META_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ApexPage xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <description>請求書 PDF</description>
    <label>請求書 PDF</label>
    <controller>InvoicePdfController</controller>
    <extensions>InvoiceExt1,InvoiceExt2</extensions>
</ApexPage>`;

const PAGE_MARKUP = `<apex:page controller="InvoicePdfController" renderAs="pdf" showHeader="false">
    <apex:repeat value="{!rows}" var="r">
        <apex:outputText value="{!r.lineNumber}" />
        <apex:outputText value="{!r.amount}" />
    </apex:repeat>
    <apex:form>
        <apex:commandButton action="{!save}" value="保存" />
    </apex:form>
</apex:page>`;

describe("extractVisualforcePage", () => {
  it("メタ + markup から controller / extensions / renderAs / タグ件数 / メソッド参照を取れる", () => {
    writeFileSync(join(pagesDir, "InvoicePdf.page-meta.xml"), META_XML);
    writeFileSync(join(pagesDir, "InvoicePdf.page"), PAGE_MARKUP);

    const sourcePath = relative(tmpRoot, join(pagesDir, "InvoicePdf.page-meta.xml"));

    const out = extractVisualforcePage({
      descriptor: {
        type: "VisualforcePage",
        fullyQualifiedName: "InvoicePdf",
        sourcePath,
        contentHash: "h",
      },
      content: META_XML,
      projectRoot: tmpRoot,
    });

    expect(out?.fullyQualifiedName).toBe("InvoicePdf");
    expect(out?.controller).toBe("InvoicePdfController");
    expect(out?.extensions).toEqual(["InvoiceExt1", "InvoiceExt2"]);
    expect(out?.renderAs).toBe("pdf");
    expect(out?.hasMarkup).toBe(true);

    const repeat = out?.markupCounts.find((m) => m.tag === "apex:repeat");
    expect(repeat?.count).toBe(1);
    const outputText = out?.markupCounts.find((m) => m.tag === "apex:outputText");
    expect(outputText?.count).toBe(2);

    expect(out?.methodReferences).toContain("rows");
    expect(out?.methodReferences).toContain("r.lineNumber");
    expect(out?.methodReferences).toContain("save");
  });

  it("markup ファイルが無くてもメタ情報のみで描画できる (ベストエフォート)", () => {
    writeFileSync(join(pagesDir, "OnlyMeta.page-meta.xml"), META_XML);

    const sourcePath = relative(tmpRoot, join(pagesDir, "OnlyMeta.page-meta.xml"));

    const out = extractVisualforcePage({
      descriptor: {
        type: "VisualforcePage",
        fullyQualifiedName: "OnlyMeta",
        sourcePath,
        contentHash: "h",
      },
      content: META_XML,
      projectRoot: tmpRoot,
    });

    expect(out?.hasMarkup).toBe(false);
    expect(out?.markupCounts).toEqual([]);
    expect(out?.methodReferences).toEqual([]);
    expect(out?.renderAs).toBeUndefined();
    expect(out?.controller).toBe("InvoicePdfController");
  });
});
