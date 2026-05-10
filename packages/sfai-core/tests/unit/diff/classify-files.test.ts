import { describe, expect, it } from "vitest";
import { classifyChangedFile } from "../../../src/diff/index.js";

describe("classifyChangedFile", () => {
  it("CustomObject", () => {
    const r = classifyChangedFile("force-app/main/default/objects/Account/Account.object-meta.xml");
    expect(r.metadataType).toBe("CustomObject");
    expect(r.fullyQualifiedName).toBe("Account");
    expect(r.category).toBe("data_model");
  });

  it("CustomField (nested under objects/)", () => {
    const r = classifyChangedFile(
      "force-app/main/default/objects/Account/fields/MyField__c.field-meta.xml",
    );
    expect(r.metadataType).toBe("CustomField");
    expect(r.fullyQualifiedName).toBe("Account.MyField__c");
    expect(r.category).toBe("data_model");
  });

  it("ValidationRule", () => {
    const r = classifyChangedFile(
      "force-app/main/default/objects/Account/validationRules/RequireWebsite.validationRule-meta.xml",
    );
    expect(r.metadataType).toBe("ValidationRule");
    expect(r.fullyQualifiedName).toBe("Account.RequireWebsite");
    expect(r.category).toBe("data_model");
  });

  it("Flow", () => {
    const r = classifyChangedFile("force-app/main/default/flows/MyFlow.flow-meta.xml");
    expect(r.metadataType).toBe("Flow");
    expect(r.fullyQualifiedName).toBe("MyFlow");
    expect(r.category).toBe("automation");
  });

  it("ApexClass", () => {
    const r = classifyChangedFile("force-app/main/default/classes/MyService.cls");
    expect(r.metadataType).toBe("ApexClass");
    expect(r.fullyQualifiedName).toBe("MyService");
    expect(r.category).toBe("logic");
  });

  it("ApexTrigger", () => {
    const r = classifyChangedFile("force-app/main/default/triggers/MyTrigger.trigger");
    expect(r.metadataType).toBe("ApexTrigger");
    expect(r.fullyQualifiedName).toBe("MyTrigger");
    expect(r.category).toBe("automation");
  });

  it("PermissionSet", () => {
    const r = classifyChangedFile(
      "force-app/main/default/permissionsets/MyPS.permissionset-meta.xml",
    );
    expect(r.metadataType).toBe("PermissionSet");
    expect(r.fullyQualifiedName).toBe("MyPS");
    expect(r.category).toBe("permission");
  });

  it("Layout は ui", () => {
    const r = classifyChangedFile(
      "force-app/main/default/layouts/Account-Account Layout.layout-meta.xml",
    );
    expect(r.metadataType).toBe("Layout");
    expect(r.category).toBe("ui");
  });

  it("LWC bundle", () => {
    const r = classifyChangedFile("force-app/main/default/lwc/myComponent/myComponent.js-meta.xml");
    expect(r.metadataType).toBe("LightningComponentBundle");
    expect(r.fullyQualifiedName).toBe("myComponent");
    expect(r.category).toBe("ui");
  });

  it("cls-meta.xml は本体ではないので除外 (operational)", () => {
    const r = classifyChangedFile("force-app/main/default/classes/MyService.cls-meta.xml");
    expect(r.metadataType).toBeNull();
    expect(r.category).toBe("operational");
  });

  it("認識できない拡張子は unknown", () => {
    const r = classifyChangedFile("README.md");
    expect(r.metadataType).toBeNull();
    expect(r.category).toBe("unknown");
  });
});
