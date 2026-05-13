import { describe, expect, it } from "vitest";
import {
  extractMethodControlFlows,
  findMatchingBrace,
  parseStatements,
} from "../../../src/graph/extractors/apex-control-flow.js";

describe("findMatchingBrace", () => {
  it("対応する '}' を返す", () => {
    expect(findMatchingBrace("a{b{c}d}e", 1)).toBe(7);
  });
  it("見つからなければ -1", () => {
    expect(findMatchingBrace("a{b{c}d", 1)).toBe(-1);
  });
});

describe("parseStatements - 基本", () => {
  it("単純文を 1 ノードずつに分ける", () => {
    const out = parseStatements("Integer a = 1; Integer b = 2;");
    expect(out.length).toBe(2);
    expect(out[0]?.kind).toBe("stmt");
  });

  it("return / throw を抽出する", () => {
    const out = parseStatements("return 42; throw new MyEx();");
    expect(out[0]).toEqual({ kind: "return", expression: "42" });
    expect(out[1]?.kind).toBe("throw");
  });

  it("DML verb 形式を抽出する", () => {
    const out = parseStatements("insert acc; update list;");
    const dmls = out.filter((n) => n.kind === "dml");
    expect(dmls.length).toBe(2);
  });

  it("Database クラス形式の DML を抽出する", () => {
    const out = parseStatements("Database.delete(rows, false);");
    const dml = out.find((n) => n.kind === "dml");
    expect(dml).toBeDefined();
    if (dml?.kind === "dml") {
      expect(dml.viaDatabaseClass).toBe(true);
      expect(dml.verb).toBe("delete");
    }
  });

  it("SOQL を [ ] から抽出して FROM オブジェクトを取る", () => {
    const out = parseStatements("List<Account> rows = [SELECT Id FROM Account WHERE Name = '']; ");
    const soql = out.find((n) => n.kind === "soql");
    expect(soql).toBeDefined();
    if (soql?.kind === "soql") {
      expect(soql.primaryObject).toBe("Account");
    }
  });
});

describe("parseStatements - 単文 if (ブレース無し)", () => {
  it("`if (cond) return;` の return が正しく return ノードになる", () => {
    const out = parseStatements("if (x == null) return;");
    const node = out[0];
    expect(node?.kind).toBe("if");
    if (node?.kind === "if") {
      expect(node.thenNodes.length).toBe(1);
      expect(node.thenNodes[0]?.kind).toBe("return");
    }
  });

  it("`if (cond) insert acc;` の DML が正しく分類される", () => {
    const out = parseStatements("if (x) insert acc; update b;");
    const ifNode = out[0];
    if (ifNode?.kind === "if") {
      expect(ifNode.thenNodes[0]?.kind).toBe("dml");
    }
    expect(out.find((n) => n.kind === "dml" && n.target === "b")).toBeDefined();
  });

  it("`for (...) sums.put(...)` の単文 for body も解釈する", () => {
    const out = parseStatements("for (Id id : ids) sums.put(id, 0);");
    const node = out[0];
    expect(node?.kind).toBe("for");
    if (node?.kind === "for") {
      expect(node.body.length).toBe(1);
      expect(node.body[0]?.kind).toBe("stmt");
    }
  });
});

describe("parseStatements - if/else", () => {
  it("if-else をネスト構造で取る", () => {
    const out = parseStatements("if (x > 0) { return 1; } else { return 0; }");
    expect(out.length).toBe(1);
    const node = out[0];
    expect(node?.kind).toBe("if");
    if (node?.kind === "if") {
      expect(node.condition).toBe("x > 0");
      expect(node.thenNodes[0]?.kind).toBe("return");
      expect(node.elseNodes[0]?.kind).toBe("return");
    }
  });

  it("else if は elseNodes 内の if としてネストされる", () => {
    const out = parseStatements(
      "if (a) { return 1; } else if (b) { return 2; } else { return 3; }",
    );
    const node = out[0];
    expect(node?.kind).toBe("if");
    if (node?.kind === "if") {
      expect(node.elseNodes.length).toBe(1);
      expect(node.elseNodes[0]?.kind).toBe("if");
      const inner = node.elseNodes[0];
      if (inner?.kind === "if") {
        expect(inner.condition).toBe("b");
        expect(inner.elseNodes[0]?.kind).toBe("return");
      }
    }
  });

  it("then 側に複数文があっても全て拾う", () => {
    const out = parseStatements("if (a) { Integer x = 1; insert acc; return x; }");
    const node = out[0];
    if (node?.kind === "if") {
      expect(node.thenNodes.length).toBe(3);
      expect(node.thenNodes.find((n) => n.kind === "dml")).toBeDefined();
      expect(node.thenNodes.find((n) => n.kind === "return")).toBeDefined();
    }
  });
});

describe("parseStatements - for/while", () => {
  it("for を抽出する", () => {
    const out = parseStatements("for (Account a : rows) { a.Name = 'x'; update a; }");
    const node = out[0];
    expect(node?.kind).toBe("for");
    if (node?.kind === "for") {
      expect(node.header).toBe("Account a : rows");
      expect(node.body.find((n) => n.kind === "dml")).toBeDefined();
    }
  });

  it("while を抽出する", () => {
    const out = parseStatements("while (i < 10) { i++; }");
    const node = out[0];
    expect(node?.kind).toBe("while");
  });
});

describe("parseStatements - try/catch/finally", () => {
  it("catch 句を全て拾う", () => {
    const out = parseStatements(
      "try { insert a; } catch (DmlException e) { return; } catch (Exception e) { throw e; } finally { rollback; }",
    );
    const node = out[0];
    expect(node?.kind).toBe("try");
    if (node?.kind === "try") {
      expect(node.catches.length).toBe(2);
      expect(node.catches[0]?.exceptionType).toBe("DmlException");
      expect(node.finallyNodes.length).toBeGreaterThan(0);
    }
  });
});

describe("extractMethodControlFlows", () => {
  it("複数メソッドそれぞれの制御フローを返す", () => {
    const code = `
      public class Foo {
        public static void run() {
          List<Account> rows = [SELECT Id FROM Account];
          if (rows.isEmpty()) {
            return;
          }
          for (Account a : rows) {
            a.Name = 'x';
          }
          update rows;
        }

        private Integer compute(Integer n) {
          if (n < 0) {
            return 0;
          }
          return n * 2;
        }
      }
    `;
    const flows = extractMethodControlFlows(code);
    expect(flows.length).toBe(2);
    const run = flows.find((f) => f.methodName === "run");
    expect(run?.nodes.find((n) => n.kind === "soql")).toBeDefined();
    expect(run?.nodes.find((n) => n.kind === "if")).toBeDefined();
    expect(run?.nodes.find((n) => n.kind === "for")).toBeDefined();
    expect(run?.nodes.find((n) => n.kind === "dml")).toBeDefined();

    const compute = flows.find((f) => f.methodName === "compute");
    expect(compute?.nodes.length).toBeGreaterThanOrEqual(2);
  });

  it("interface / abstract 宣言は body が無いので除外される", () => {
    const code = `
      public interface I {
        void doIt();
        Integer count();
      }
      public abstract class A {
        public abstract void hook();
      }
    `;
    const flows = extractMethodControlFlows(code);
    expect(flows.length).toBe(0);
  });

  it("コメント・文字列内の '{' '}' に騙されない", () => {
    const code = `
      public class C {
        // body has } here
        public void m() {
          String s = 'this { is } a string';
          if (true) { return; }
        }
      }
    `;
    const flows = extractMethodControlFlows(code);
    expect(flows.length).toBe(1);
    expect(flows[0]?.nodes.find((n) => n.kind === "if")).toBeDefined();
  });
});
