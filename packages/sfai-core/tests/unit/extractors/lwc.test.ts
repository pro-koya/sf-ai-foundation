import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractLwc } from "../../../src/graph/extractors/lwc.js";

let tmpRoot: string;
let bundleDir: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "sfai-lwc-"));
  bundleDir = join(tmpRoot, "force-app", "main", "default", "lwc", "claimDashboard");
  mkdirSync(bundleDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const META_XML = `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <isExposed>true</isExposed>
    <masterLabel>Claim Dashboard</masterLabel>
    <description>Top-level dashboard for claim agents</description>
    <targets>
        <target>lightning__RecordPage</target>
        <target>lightning__AppPage</target>
    </targets>
</LightningComponentBundle>`;

const JS_SOURCE = `import { LightningElement, api, wire } from 'lwc';
import getClaim from '@salesforce/apex/ClaimService.getClaim';
import calculateBalance from '@salesforce/apex/AccountBalanceService.recalculate';
import claimLabel from '@salesforce/label/c.Claim_Dashboard_Title';

export default class ClaimDashboard extends LightningElement {
    @api recordId;
    @api hideHeader = false;

    @wire(getClaim, { recordId: '$recordId' })
    wiredClaim({ data, error }) {}

    @wire(calculateBalance, { accountId: '$recordId' })
    balance;

    notify() {
        this.dispatchEvent(new CustomEvent('claimupdated', { detail: { id: this.recordId } }));
        this.dispatchEvent(new CustomEvent('refresh'));
    }
}`;

const HTML_SOURCE = `<template>
    <lightning-card title="Claims">
        <template lwc:if={hasClaims}>
            <c-claim-stat-list claims={claims}></c-claim-stat-list>
        </template>
        <template lwc:else>
            <p>No claims</p>
        </template>
        <template for:each={claims} for:item="claim">
            <c-claim-row key={claim.id} claim={claim}></c-claim-row>
        </template>
        <lightning-button label="Refresh" onclick={refresh}></lightning-button>
    </lightning-card>
</template>`;

describe("extractLwc", () => {
  it("LWC bundle のメタ・JS・HTML から各情報を抽出する", () => {
    writeFileSync(join(bundleDir, "claimDashboard.js-meta.xml"), META_XML);
    writeFileSync(join(bundleDir, "claimDashboard.js"), JS_SOURCE);
    writeFileSync(join(bundleDir, "claimDashboard.html"), HTML_SOURCE);
    writeFileSync(join(bundleDir, "claimDashboard.css"), "/* css */");

    const sourcePath = relative(tmpRoot, join(bundleDir, "claimDashboard.js-meta.xml"));

    const out = extractLwc({
      descriptor: {
        type: "LightningWebComponent",
        fullyQualifiedName: "claimDashboard",
        sourcePath,
        contentHash: "h",
      },
      content: META_XML,
      projectRoot: tmpRoot,
    });

    expect(out?.fullyQualifiedName).toBe("claimDashboard");
    expect(out?.apiVersion).toBe("62.0");
    expect(out?.isExposed).toBe(true);
    expect(out?.masterLabel).toBe("Claim Dashboard");
    expect(out?.targets).toEqual(["lightning__RecordPage", "lightning__AppPage"]);
    expect(out?.hasHtml).toBe(true);
    expect(out?.hasCss).toBe(true);

    expect(out?.apexImports.length).toBe(2);
    const classes = out?.apexImports.map((a) => a.className).toSorted();
    expect(classes).toEqual(["AccountBalanceService", "ClaimService"]);

    expect(out?.publicProperties).toEqual(["hideHeader", "recordId"]);
    expect(out?.wires.length).toBe(2);
    const wireTargets = out?.wires.map((w) => w.target).toSorted();
    expect(wireTargets).toEqual(["calculateBalance", "getClaim"]);

    expect(out?.customEvents).toEqual(["claimupdated", "refresh"]);
    expect(out?.childComponents).toEqual(["c-claim-row", "c-claim-stat-list"]);
    expect(out?.standardComponents.find((c) => c.tag === "lightning-card")?.count).toBe(1);
    expect(out?.directives).toContain("lwc:if");
    expect(out?.directives).toContain("lwc:else");
    expect(out?.directives).toContain("for:each");
    expect(out?.labelImports).toEqual(["c.Claim_Dashboard_Title"]);
  });

  it("HTML/CSS/JS が無くてもメタだけで描画できる (ベストエフォート)", () => {
    writeFileSync(join(bundleDir, "claimDashboard.js-meta.xml"), META_XML);

    const sourcePath = relative(tmpRoot, join(bundleDir, "claimDashboard.js-meta.xml"));

    const out = extractLwc({
      descriptor: {
        type: "LightningWebComponent",
        fullyQualifiedName: "claimDashboard",
        sourcePath,
        contentHash: "h",
      },
      content: META_XML,
      projectRoot: tmpRoot,
    });

    expect(out?.fullyQualifiedName).toBe("claimDashboard");
    expect(out?.hasHtml).toBe(false);
    expect(out?.hasCss).toBe(false);
    expect(out?.apexImports).toEqual([]);
    expect(out?.publicProperties).toEqual([]);
    expect(out?.childComponents).toEqual([]);
  });
});
