import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { extractAuraBundle } from "../../../src/graph/extractors/aura-bundle.js";

let tmpRoot: string;
let bundleDir: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "yohaku-aura-"));
  bundleDir = join(tmpRoot, "force-app", "main", "default", "aura", "ClaimSummary");
  mkdirSync(bundleDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const META_XML = `<?xml version="1.0" encoding="UTF-8"?>
<AuraDefinitionBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <description>Legacy claim summary component</description>
</AuraDefinitionBundle>`;

const CMP_MARKUP = `<aura:component implements="flexipage:availableForRecordHome">
    <aura:attribute name="recordId" type="Id" />
    <aura:attribute name="claim" type="Object" />
    <aura:handler event="aura:doneRendering" action="{!c.handleDone}" />
    <aura:handler event="c:claimUpdated" action="{!c.refresh}" />
</aura:component>`;

describe("extractAuraBundle", () => {
  it("Component bundle の構成・attribute・handler を取り込む", () => {
    writeFileSync(join(bundleDir, "ClaimSummary.cmp-meta.xml"), META_XML);
    writeFileSync(join(bundleDir, "ClaimSummary.cmp"), CMP_MARKUP);
    writeFileSync(join(bundleDir, "ClaimSummaryController.js"), "({})");
    writeFileSync(join(bundleDir, "ClaimSummaryHelper.js"), "({})");

    const sourcePath = relative(tmpRoot, join(bundleDir, "ClaimSummary.cmp-meta.xml"));

    const out = extractAuraBundle({
      descriptor: {
        type: "AuraBundle",
        fullyQualifiedName: "ClaimSummary",
        sourcePath,
        contentHash: "h",
      },
      content: META_XML,
      projectRoot: tmpRoot,
    });

    expect(out?.fullyQualifiedName).toBe("ClaimSummary");
    expect(out?.bundleKind).toBe("Component");
    expect(out?.apiVersion).toBe("58.0");
    expect(out?.hasController).toBe(true);
    expect(out?.hasHelper).toBe(true);
    expect(out?.hasRenderer).toBe(false);
    expect(out?.hasStyle).toBe(false);
    expect(out?.attributes).toEqual(["claim", "recordId"]);
    expect(out?.handlers).toEqual(["aura:doneRendering", "c:claimUpdated"]);
  });

  it(".app-meta.xml なら Application として扱う", () => {
    const appMeta = META_XML;
    writeFileSync(join(bundleDir, "ClaimSummary.app-meta.xml"), appMeta);
    writeFileSync(join(bundleDir, "ClaimSummary.app"), "<aura:application></aura:application>");

    const sourcePath = relative(tmpRoot, join(bundleDir, "ClaimSummary.app-meta.xml"));

    const out = extractAuraBundle({
      descriptor: {
        type: "AuraBundle",
        fullyQualifiedName: "ClaimSummary",
        sourcePath,
        contentHash: "h",
      },
      content: appMeta,
      projectRoot: tmpRoot,
    });

    expect(out?.bundleKind).toBe("Application");
    expect(out?.attributes).toEqual([]);
  });
});
