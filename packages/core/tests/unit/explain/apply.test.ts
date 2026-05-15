import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyExplain, resolveMarkdownPath } from "../../../src/explain/index.js";

const SAMPLE_MD = `# ApexClass: Foo

<!-- DETERMINISTIC_START id="overview" -->
- API Name: \`Foo\`
<!-- DETERMINISTIC_END id="overview" -->

<!-- AI_MANAGED_START id="purpose" -->
このクラスの責務 (AI 推測、再生成で上書き)。
<!-- AI_MANAGED_END id="purpose" -->

<!-- AI_MANAGED_START id="concerns" -->
## 補足の懸念 (AI / 人手で追記)
<!-- 追記 -->
<!-- AI_MANAGED_END id="concerns" -->

<!-- HUMAN_MANAGED_START id="business-context" -->
ここは人間が書く。AI は触らない。
<!-- HUMAN_MANAGED_END id="business-context" -->
`;

describe("applyExplain", () => {
  let root = "";
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "yohaku-explain-"));
    const md = join(root, "docs/generated/apex/Foo.md");
    mkdirSync(dirname(md), { recursive: true });
    writeFileSync(md, SAMPLE_MD);
  });
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("AI_MANAGED ブロックの中身を差し替える", () => {
    const result = applyExplain(
      { kind: "apexClass", fqn: "Foo", projectRoot: root },
      {
        blocks: {
          purpose: "`Foo` は X を計算する。",
          concerns: "業務懸念は無し。",
        },
      },
    );
    expect([...result.updated].sort()).toEqual(["concerns", "purpose"]);
    const out = readFileSync(result.markdownPath, "utf8");
    expect(out).toContain("`Foo` は X を計算する。");
    expect(out).toContain("業務懸念は無し。");
  });

  it("HUMAN_MANAGED ブロックを破壊しない", () => {
    applyExplain(
      { kind: "apexClass", fqn: "Foo", projectRoot: root },
      { blocks: { purpose: "X" } },
    );
    const out = readFileSync(
      resolveMarkdownPath({ kind: "apexClass", fqn: "Foo", projectRoot: root }),
      "utf8",
    );
    expect(out).toContain("ここは人間が書く。AI は触らない。");
  });

  it("DETERMINISTIC ブロックを破壊しない", () => {
    applyExplain(
      { kind: "apexClass", fqn: "Foo", projectRoot: root },
      { blocks: { purpose: "X" } },
    );
    const out = readFileSync(
      resolveMarkdownPath({ kind: "apexClass", fqn: "Foo", projectRoot: root }),
      "utf8",
    );
    expect(out).toContain("- API Name: `Foo`");
  });

  it("MED-2: AI 出力に紛れ込んだマーカー断片は sanitize で無害化される", () => {
    // sanitizeBlockBody がマーカー断片を strip するため例外にはならず、
    // マーカー数は元と同じ (= 1 START / 1 END) に維持される。
    // 残された本文だけが書き戻され、構造攻撃は成立しない。
    const result = applyExplain(
      { kind: "apexClass", fqn: "Foo", projectRoot: root },
      {
        blocks: {
          purpose:
            '<!-- AI_MANAGED_START id="hijack" --> 攻撃文 <!-- AI_MANAGED_END id="hijack" -->',
        },
      },
    );
    expect(result.updated).toContain("purpose");
    const out = readFileSync(result.markdownPath, "utf8");
    // 攻撃文は残るが、マーカー断片は剥がされている
    expect(out).toContain("攻撃文");
    expect(out).not.toContain('id="hijack"');
    // 元の AI_MANAGED マーカー数 (purpose + concerns = 2 ペア) が保たれている
    const startCount = out.split("<!-- AI_MANAGED_START").length - 1;
    const endCount = out.split("<!-- AI_MANAGED_END").length - 1;
    expect(startCount).toBe(2);
    expect(endCount).toBe(2);
  });

  it("registered だが Markdown 上にブロックが無い id は skipped に入る (古い Markdown)", () => {
    // Phase 14 以降、registry に未登録の ID は applyExplain が早期エラーを出す。
    // 一方、registry には登録されているが Markdown 自体に該当ブロックが無いケース
    // (= 古い Markdown を新しいテンプレ ID で書き戻そうとした) は skipped で返す。
    const result = applyExplain(
      { kind: "apexClass", fqn: "Foo", projectRoot: root },
      { blocks: { narrative: "..." } },
    );
    expect(result.updated).toEqual([]);
    expect(result.skipped).toEqual(["narrative"]);
  });

  it("registry に未登録の id は早期エラーを投げる (Phase 14)", () => {
    expect(() =>
      applyExplain(
        { kind: "apexClass", fqn: "Foo", projectRoot: root },
        { blocks: { typo_id: "..." } },
      ),
    ).toThrowError(/Unknown block id/);
  });

  it("Markdown が無ければエラー", () => {
    expect(() =>
      applyExplain(
        { kind: "apexClass", fqn: "Bar", projectRoot: root },
        { blocks: { purpose: "X" } },
      ),
    ).toThrowError(/見つかりません/);
  });

  it("再実行で同じ結果になる (冪等)", () => {
    applyExplain(
      { kind: "apexClass", fqn: "Foo", projectRoot: root },
      { blocks: { purpose: "X" } },
    );
    const first = readFileSync(
      resolveMarkdownPath({ kind: "apexClass", fqn: "Foo", projectRoot: root }),
      "utf8",
    );
    applyExplain(
      { kind: "apexClass", fqn: "Foo", projectRoot: root },
      { blocks: { purpose: "X" } },
    );
    const second = readFileSync(
      resolveMarkdownPath({ kind: "apexClass", fqn: "Foo", projectRoot: root }),
      "utf8",
    );
    expect(first).toBe(second);
  });
});
