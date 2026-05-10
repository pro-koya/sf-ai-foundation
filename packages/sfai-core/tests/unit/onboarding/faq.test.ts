import { describe, expect, it } from "vitest";
import { extractFaq, parseDialogLog, renderFaqMarkdown } from "../../../src/onboarding/index.js";

describe("parseDialogLog", () => {
  it("question/answer のセクションを抽出", () => {
    const log = `
# 質問

Account ってなに？

Account は標準オブジェクトです。
顧客マスタとして使われます。

---

# 質問

Order__c の Customer__c 参照先は？

Account への Lookup です。
`;
    const exchanges = parseDialogLog(log);
    expect(exchanges.length).toBeGreaterThanOrEqual(2);
  });

  it("質問らしくないテキストは除外", () => {
    const log = "ただのメモです\n\n本文";
    expect(parseDialogLog(log)).toEqual([]);
  });
});

describe("extractFaq", () => {
  it("頻出質問を occurrences でカウント", () => {
    const log = `
# Q
Account ってなに？

標準オブジェクトです

---

# Q
Account ってなに？

標準オブジェクトです (再質問)

---

# Q
Order とは？

Order__c はカスタム
`;
    const candidates = extractFaq(log);
    const acc = candidates.find((c) => c.question.includes("Account"));
    expect(acc?.occurrences).toBe(2);
  });

  it("PII (email) は masked", () => {
    const log = `
# Q
yamada@example.com にメールしたら何が起きる？

メールが届きます
`;
    const candidates = extractFaq(log);
    expect(candidates[0]?.maskedQuestion).toContain("[HASHED:email-address:");
    expect(candidates[0]?.maskedQuestion).not.toContain("yamada@example.com");
  });
});

describe("renderFaqMarkdown", () => {
  it("AI_MANAGED + HUMAN_MANAGED ブロックを含む", () => {
    const md = renderFaqMarkdown("topic-x", []);
    expect(md).toContain("AI_MANAGED_START");
    expect(md).toContain("HUMAN_MANAGED_START");
    expect(md).toContain("(候補なし)");
  });
});
