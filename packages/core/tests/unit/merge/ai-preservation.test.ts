import { describe, expect, it } from "vitest";
import { mergeRender } from "../../../src/merge/merge.js";

const TEMPLATE = `# Foo

<!-- DETERMINISTIC_START id="overview" -->
- API: \`Foo\`
<!-- DETERMINISTIC_END id="overview" -->

<!-- AI_MANAGED_START id="purpose" -->
このクラスの責務 (AI 推測、再生成で上書き)。
<!-- AI_MANAGED_END id="purpose" -->

<!-- HUMAN_MANAGED_START id="business-context" -->
<!-- 業務文脈をここに記述 -->
<!-- HUMAN_MANAGED_END id="business-context" -->
`;

const EXISTING_CUSTOMIZED_AI = `# Foo

<!-- DETERMINISTIC_START id="overview" -->
- API: \`Foo (古い)\`
<!-- DETERMINISTIC_END id="overview" -->

<!-- AI_MANAGED_START id="purpose" -->
\`Foo\` は X を計算する。/yohaku-explain で書き換えた内容。
<!-- AI_MANAGED_END id="purpose" -->

<!-- HUMAN_MANAGED_START id="business-context" -->
人間が書いた業務メモ
<!-- HUMAN_MANAGED_END id="business-context" -->
`;

const EXISTING_DEFAULT_AI = `# Foo

<!-- DETERMINISTIC_START id="overview" -->
- API: \`Foo (古い)\`
<!-- DETERMINISTIC_END id="overview" -->

<!-- AI_MANAGED_START id="purpose" -->
このクラスの責務 (AI 推測、再生成で上書き)。
<!-- AI_MANAGED_END id="purpose" -->

<!-- HUMAN_MANAGED_START id="business-context" -->
<!-- 業務文脈をここに記述 -->
<!-- HUMAN_MANAGED_END id="business-context" -->
`;

describe("mergeRender - AI_MANAGED 保全", () => {
  it("AI_MANAGED が customized なら保全する", () => {
    const result = mergeRender(TEMPLATE, EXISTING_CUSTOMIZED_AI, { templatePath: "/x.md" });
    expect(result.content).toContain("/yohaku-explain で書き換えた内容");
    // DETERMINISTIC は新テンプレで上書き
    expect(result.content).toContain("- API: `Foo`");
    expect(result.content).not.toContain("(古い)");
  });

  it("AI_MANAGED が既定値のままなら新テンプレで上書きする", () => {
    const result = mergeRender(TEMPLATE, EXISTING_DEFAULT_AI, { templatePath: "/x.md" });
    expect(result.content).toContain("このクラスの責務 (AI 推測、再生成で上書き)。");
  });

  it("HUMAN_MANAGED は常に保全されたまま", () => {
    const result = mergeRender(TEMPLATE, EXISTING_CUSTOMIZED_AI, { templatePath: "/x.md" });
    expect(result.content).toContain("人間が書いた業務メモ");
  });
});
