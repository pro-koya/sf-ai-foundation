import { describe, expect, it } from "vitest";
import { extractApexBody } from "../../../src/graph/extractors/apex-body.js";

const ACCOUNT_HANDLER = `
public with sharing class AccountHandler {
  @AuraEnabled(cacheable=true)
  public static List<Account> recentAccounts(Integer max) {
    List<Account> rows = [SELECT Id, Name FROM Account ORDER BY CreatedDate DESC LIMIT :max];
    return rows;
  }

  @future(callout=true)
  public static void notifyExternal(Id accountId) {
    HttpRequest req = new HttpRequest();
    req.setEndpoint('https://example.com');
    Http http = new Http();
    HttpResponse res = http.send(req);
    System.debug(res.getBody());
  }

  public void doInsert(Account a) {
    try {
      insert a;
    } catch (DmlException e) {
      System.debug(e);
    }
  }

  public static void deleteContacts(List<Contact> rows) {
    Database.delete(rows, false);
  }

  public Id callOther(Account a) {
    return AccountService.upsertOne(a);
  }
}
`;

describe("extractApexBody", () => {
  it("メソッドとアノテーションを抽出する", () => {
    const body = extractApexBody(ACCOUNT_HANDLER);
    const names = body.methods.map((m) => m.name).sort();
    expect(names).toContain("recentAccounts");
    expect(names).toContain("notifyExternal");
    expect(names).toContain("doInsert");
    expect(names).toContain("deleteContacts");
    expect(names).toContain("callOther");

    const recent = body.methods.find((m) => m.name === "recentAccounts");
    expect(recent?.isStatic).toBe(true);
    expect(recent?.visibility).toBe("public");
    expect(recent?.annotations.some((a) => a.startsWith("AuraEnabled"))).toBe(true);

    const notify = body.methods.find((m) => m.name === "notifyExternal");
    expect(notify?.annotations.some((a) => a.startsWith("future"))).toBe(true);
  });

  it("SOQL を 1 件以上抽出し primaryObject を取れる", () => {
    const body = extractApexBody(ACCOUNT_HANDLER);
    expect(body.soqlQueries.length).toBeGreaterThanOrEqual(1);
    expect(body.soqlQueries[0]?.primaryObject).toBe("Account");
  });

  it("DML を verb 形式と Database クラス形式の両方で検出する", () => {
    const body = extractApexBody(ACCOUNT_HANDLER);
    const verbForms = body.dmlOperations.filter((d) => !d.viaDatabaseClass);
    const dbForms = body.dmlOperations.filter((d) => d.viaDatabaseClass);
    expect(verbForms.some((d) => d.kind === "insert" && d.target === "a")).toBe(true);
    expect(dbForms.some((d) => d.kind === "delete")).toBe(true);
  });

  it("クラス参照 (AccountService.upsertOne) を検出する", () => {
    const body = extractApexBody(ACCOUNT_HANDLER);
    expect(body.classReferences.some((r) => r.className === "AccountService")).toBe(true);
  });

  it("try/catch と HTTP コールアウトを検出する", () => {
    const body = extractApexBody(ACCOUNT_HANDLER);
    expect(body.hasTryCatch).toBe(true);
    expect(body.hasCallout).toBe(true);
  });

  it("空クラスでも壊れない", () => {
    const body = extractApexBody("public class Empty {}");
    expect(body.methods.length).toBe(0);
    expect(body.soqlQueries.length).toBe(0);
    expect(body.hasCallout).toBe(false);
  });

  it("コメント内の SOQL を無視する", () => {
    const code = `
      public class C {
        /* [SELECT Id FROM Account] */
        // [SELECT Id FROM Contact]
        public static void m() {}
      }
    `;
    const body = extractApexBody(code);
    expect(body.soqlQueries.length).toBe(0);
  });
});
