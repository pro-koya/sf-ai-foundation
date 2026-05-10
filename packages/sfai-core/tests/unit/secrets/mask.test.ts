import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, maskContent } from "../../../src/secrets/index.js";

describe("maskContent", () => {
  it("メールアドレスをハッシュに置換する", () => {
    const result = maskContent("Contact: yamada@example.com please.", DEFAULT_RULES);
    expect(result.masked).toContain("[HASHED:email-address:");
    expect(result.masked).not.toContain("yamada@example.com");
    expect(result.hits.find((h) => h.ruleId === "email-address")).toBeDefined();
  });

  it("Salesforce 18 文字 ID は preserve で保持される", () => {
    const id = "001A0000001abcdEFG";
    const result = maskContent(`ID=${id}`);
    expect(result.masked).toContain(id);
    const hit = result.hits.find((h) => h.ruleId === "salesforce-id-18");
    expect(hit?.action).toBe("preserved");
  });

  it("API key ライクな長い文字列は REDACTED に置換", () => {
    const key = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
    const result = maskContent(`token=${key}`);
    expect(result.masked).toContain("[REDACTED:api-key-like]");
  });

  it("ヒットが無ければ入力をそのまま返す", () => {
    const result = maskContent("plain text without secrets.");
    expect(result.masked).toBe("plain text without secrets.");
    expect(result.hits).toHaveLength(0);
  });
});
