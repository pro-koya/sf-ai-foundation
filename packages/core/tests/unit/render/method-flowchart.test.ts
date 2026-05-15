import { describe, expect, it } from "vitest";
import { extractMethodControlFlows } from "../../../src/graph/extractors/apex-control-flow.js";
import { buildMethodFlowchart } from "../../../src/render/method-flowchart.js";

function flowFor(code: string, methodName: string) {
  const flows = extractMethodControlFlows(code);
  const f = flows.find((x) => x.methodName === methodName);
  if (f === undefined) throw new Error(`method ${methodName} not found`);
  return f;
}

describe("buildMethodFlowchart - 基本", () => {
  it("空メソッドは Start → End", () => {
    const f = flowFor("public class C { public void run() { } }", "run");
    const m = buildMethodFlowchart(f).mermaid;
    expect(m.startsWith("flowchart TD")).toBe(true);
    expect(m).toContain("n_start([run])");
    expect(m).toContain("n_end([End])");
    expect(m).toContain("n_start --> n_end");
  });

  it("単純文を順次接続する", () => {
    const f = flowFor("public class C { public void run() { Integer a = 1; insert acc; } }", "run");
    const m = buildMethodFlowchart(f).mermaid;
    expect(m).toContain('"Integer a = 1"');
    expect(m).toContain("DML insert: acc");
  });

  it("SOQL を /SOQL: <obj>/ 形で出す", () => {
    const f = flowFor(
      "public class C { public void run() { List<Account> r = [SELECT Id FROM Account]; } }",
      "run",
    );
    const m = buildMethodFlowchart(f).mermaid;
    expect(m).toContain("SOQL: Account");
  });
});

describe("buildMethodFlowchart - if/else", () => {
  it("if-else に true/false ラベルを付ける", () => {
    const f = flowFor(
      "public class C { public void run() { if (x > 0) { return; } else { insert acc; } } }",
      "run",
    );
    const m = buildMethodFlowchart(f).mermaid;
    expect(m).toContain("|true|");
    expect(m).toContain("|false|");
  });

  it("else 無しの if は false 側が join に直接行く", () => {
    const f = flowFor(
      "public class C { public void run() { if (x) { insert acc; } update b; } }",
      "run",
    );
    const m = buildMethodFlowchart(f).mermaid;
    expect(m).toContain("|true|");
    expect(m).toContain("|false|");
    // join ノード (空ラベル) が存在する
    expect(m).toMatch(/n\d+\(\( \)\)/);
  });
});

describe("buildMethodFlowchart - for/while", () => {
  it("for に back-edge を点線で書く", () => {
    const f = flowFor(
      "public class C { public void run() { for (Account a : rows) { insert a; } } }",
      "run",
    );
    const m = buildMethodFlowchart(f).mermaid;
    expect(m).toContain("for Account a : rows");
    expect(m).toContain("-.->|loop|");
  });
});

describe("buildMethodFlowchart - try/catch", () => {
  it("try / catch / finally の各ブロックを描く", () => {
    const f = flowFor(
      "public class C { public void run() { try { insert a; } catch (DmlException e) { return; } finally { update b; } } }",
      "run",
    );
    const m = buildMethodFlowchart(f).mermaid;
    expect(m).toContain("try");
    expect(m).toContain("catch DmlException");
    expect(m).toContain("finally");
  });
});

describe("buildMethodFlowchart - ノード詳細表", () => {
  it("各ノードに対応する details エントリが返る", () => {
    const f = flowFor(
      "public class C { public void run() { Integer a = 1; insert acc; if (x) return; } }",
      "run",
    );
    const out = buildMethodFlowchart(f);
    expect(out.details.length).toBeGreaterThanOrEqual(3);
    expect(out.details.find((d) => d.kind === "dml")).toBeDefined();
    expect(out.details.find((d) => d.kind === "if")).toBeDefined();
    expect(out.details.find((d) => d.kind === "return")).toBeDefined();
  });

  it("長い SOQL の fullText は途切れない", () => {
    const longSoql =
      "[SELECT Id, Name, AccountId, IsClosed FROM Opportunity WHERE Account.Industry = 'Finance' AND Amount > 100000 LIMIT 200]";
    const f = flowFor(
      `public class C { public void run() { List<Opportunity> r = ${longSoql}; } }`,
      "run",
    );
    const out = buildMethodFlowchart(f);
    const soql = out.details.find((d) => d.kind === "soql");
    expect(soql).toBeDefined();
    expect(soql?.fullText).toContain("LIMIT 200");
  });
});

describe("buildMethodFlowchart - 安全性", () => {
  it("メソッド名に Mermaid 特殊文字を含んでもラベルが壊れない", () => {
    // Apex 仕様上 ASCII のみだが、ガード
    const code = `public class C { public void run() { String s = "a\\"b"; return; } }`;
    const f = flowFor(code, "run");
    const m = buildMethodFlowchart(f).mermaid;
    expect(m).toContain("flowchart TD");
  });
});
