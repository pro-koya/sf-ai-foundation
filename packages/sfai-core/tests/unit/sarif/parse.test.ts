import { describe, expect, it } from "vitest";
import { normalizeSarif } from "../../../src/sarif/index.js";

describe("normalizeSarif", () => {
  it("空 / 不正は空配列", () => {
    expect(normalizeSarif(null)).toEqual([]);
    expect(normalizeSarif({})).toEqual([]);
    expect(normalizeSarif("not an object")).toEqual([]);
  });

  it("Code Analyzer 風のサンプルから NormalizedFinding を抽出", () => {
    const sample = {
      version: "2.1.0",
      runs: [
        {
          tool: { driver: { name: "Salesforce Code Analyzer" } },
          results: [
            {
              ruleId: "ApexUnusedDeclaration",
              level: "warning",
              message: { text: "Unused variable foo" },
              locations: [
                {
                  physicalLocation: {
                    artifactLocation: { uri: "force-app/main/default/classes/My.cls" },
                    region: { startLine: 12 },
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const findings = normalizeSarif(sample);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe("ApexUnusedDeclaration");
    expect(findings[0]?.level).toBe("warning");
    expect(findings[0]?.message).toContain("Unused variable");
    expect(findings[0]?.locations).toContain("force-app/main/default/classes/My.cls");
    expect(findings[0]?.tool).toBe("Salesforce Code Analyzer");
  });

  it("ruleId 欠損は unknown-rule、message 欠損は空文字", () => {
    const sample = {
      runs: [{ results: [{}] }],
    };
    const findings = normalizeSarif(sample);
    expect(findings[0]?.ruleId).toBe("unknown-rule");
    expect(findings[0]?.message).toBe("");
  });
});
