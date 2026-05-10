import { describe, expect, it } from "vitest";
import { extractPermissionSetBody } from "../../../src/graph/extractors/permission-set-body.js";

const SAMPLE = {
  objectPermissions: [
    {
      object: "Account",
      allowCreate: "true",
      allowRead: "true",
      allowEdit: "true",
      allowDelete: "false",
      viewAllRecords: "false",
      modifyAllRecords: "false",
    },
    {
      object: "Order__c",
      allowCreate: "true",
      allowRead: "true",
      allowEdit: "true",
      allowDelete: "true",
      viewAllRecords: "true",
      modifyAllRecords: "false",
    },
  ],
  fieldPermissions: [
    { field: "Account.Credit_Limit__c", readable: "true", editable: "false" },
    { field: "Order__c.Discount_Amount__c", readable: "true", editable: "true" },
  ],
  classAccesses: [
    { apexClass: "OrderEntryController", enabled: "true" },
    { apexClass: "ClaimDashboardController", enabled: "false" },
  ],
  userPermissions: [
    { name: "ManageUsers", enabled: "true" },
    { name: "ViewSetup", enabled: "false" },
  ],
};

describe("extractPermissionSetBody", () => {
  it("objectPermissions を boolean に変換", () => {
    const b = extractPermissionSetBody(SAMPLE);
    const acct = b.objectPermissions.find((p) => p.object === "Account");
    expect(acct?.create).toBe(true);
    expect(acct?.delete).toBe(false);
    expect(acct?.viewAll).toBe(false);
  });

  it("fieldPermissions も読める / 並び順は field 名のアルファベット", () => {
    const b = extractPermissionSetBody(SAMPLE);
    expect(b.fieldPermissions.length).toBe(2);
    expect(b.fieldPermissions[0]?.field).toBe("Account.Credit_Limit__c");
  });

  it("classAccesses の enabled を boolean に変換", () => {
    const b = extractPermissionSetBody(SAMPLE);
    const c = b.classAccesses.find((c) => c.apexClass === "OrderEntryController");
    expect(c?.enabled).toBe(true);
    const d = b.classAccesses.find((c) => c.apexClass === "ClaimDashboardController");
    expect(d?.enabled).toBe(false);
  });

  it("userPermissions は enabled=true のみ抽出", () => {
    const b = extractPermissionSetBody(SAMPLE);
    expect(b.userPermissions).toEqual(["ManageUsers"]);
  });

  it("空ノードでも壊れない", () => {
    const b = extractPermissionSetBody({});
    expect(b.objectPermissions).toEqual([]);
    expect(b.fieldPermissions).toEqual([]);
    expect(b.classAccesses).toEqual([]);
    expect(b.userPermissions).toEqual([]);
  });
});
