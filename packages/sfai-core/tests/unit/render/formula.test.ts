import { describe, expect, it } from "vitest";
import { formulaToNaturalLanguage, parseFormula } from "../../../src/render/formula.js";

describe("parseFormula", () => {
  it("単純なフィールド比較を AST にする", () => {
    const r = parseFormula("Amount > 100");
    expect("ast" in r).toBe(true);
    if ("ast" in r) {
      expect(r.ast.kind).toBe("binary");
    }
  });

  it("AND 関数呼び出しを取れる", () => {
    const r = parseFormula("AND(a = 1, b = 2)");
    expect("ast" in r).toBe(true);
    if ("ast" in r && r.ast.kind === "call") {
      expect(r.ast.name).toBe("AND");
      expect(r.ast.args.length).toBe(2);
    }
  });

  it("文字列リテラルを取れる", () => {
    const r = parseFormula('Status__c = "Approved"');
    expect("ast" in r).toBe(true);
  });

  it("ネストした関数呼び出し", () => {
    const r = parseFormula("AND(ISCHANGED(F), F = 'V')");
    expect("ast" in r).toBe(true);
  });

  it("NULL/TRUE/FALSE", () => {
    expect("ast" in parseFormula("TRUE")).toBe(true);
    expect("ast" in parseFormula("FALSE")).toBe(true);
    expect("ast" in parseFormula("NULL")).toBe(true);
  });

  it("無効な数式は error を返す", () => {
    const r = parseFormula("AND(");
    expect("error" in r).toBe(true);
  });
});

describe("formulaToNaturalLanguage", () => {
  it("空文字列は (条件式なし)", () => {
    expect(formulaToNaturalLanguage("")).toContain("条件式なし");
  });

  it("ISCHANGED を自然語化", () => {
    const out = formulaToNaturalLanguage("ISCHANGED(Status__c)");
    expect(out).toContain("`Status__c`");
    expect(out).toContain("変更された");
  });

  it("ISPICKVAL を自然語化", () => {
    const out = formulaToNaturalLanguage('ISPICKVAL(Status__c, "Approved")');
    expect(out).toContain("`Status__c`");
    expect(out).toContain('"Approved"');
    expect(out).toContain("等しい");
  });

  it("AND を箇条書きに展開", () => {
    const out = formulaToNaturalLanguage('AND(ISCHANGED(F), F = "V")');
    expect(out).toContain("**全て**");
    expect(out).toContain("`F`");
  });

  it("OR を箇条書きに展開", () => {
    const out = formulaToNaturalLanguage("OR(a = 1, b = 2)");
    expect(out).toContain("**いずれか**");
  });

  it("NULLVALUE は (`F` が空なら 0) 形式", () => {
    const out = formulaToNaturalLanguage("NULLVALUE(F, 0) > 10");
    expect(out).toContain("空なら");
    expect(out).toContain("超える");
  });

  it("実 sfai-trial の Order_CreditLimitCheck を解析できる", () => {
    const formula = `AND(
      ISPICKVAL(Status__c, "Submitted"),
      Account__r.Credit_Limit__c > 0,
      Net_Amount__c > Account__r.Credit_Available__c
    )`;
    const out = formulaToNaturalLanguage(formula);
    expect(out).toContain("**全て**");
    expect(out).toContain("`Status__c`");
    expect(out).toContain('"Submitted"');
    expect(out).toContain("`Account__r.Credit_Limit__c`");
    expect(out).toContain("超える");
  });

  it("実 sfai-trial の Inventory_NoOverReserve を解析できる", () => {
    const formula = "NULLVALUE(Quantity_Reserved__c, 0) > NULLVALUE(Quantity_Available__c, 0)";
    const out = formulaToNaturalLanguage(formula);
    expect(out).toContain("空なら");
    expect(out).toContain("超える");
  });

  it("無効な数式は raw 文字列で fallback", () => {
    const out = formulaToNaturalLanguage("AND(");
    expect(out).toContain("失敗");
    expect(out).toContain("AND(");
  });
});
