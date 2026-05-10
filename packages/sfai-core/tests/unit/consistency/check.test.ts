import { describe, expect, it } from "vitest";
import {
  ConsistencyAssertionError,
  expectMatchRate,
  runConsistencyCheck,
} from "../../../src/consistency/index.js";

describe("runConsistencyCheck", () => {
  it("常に同じ出力を返す producer は exactMatchRate=1.0", async () => {
    const result = await runConsistencyCheck({
      producer: async () => ({ category: "data_model", entity: "Account.Industry" }),
      runs: 5,
    });
    expect(result.exactMatchRate).toBe(1);
    expect(result.runs).toBe(5);
  });

  it("出力にバリエーションがあれば exactMatchRate < 1", async () => {
    let i = 0;
    const result = await runConsistencyCheck({
      producer: async () => {
        i += 1;
        return { v: i % 2 === 0 ? "even" : "odd" };
      },
      runs: 4,
    });
    // 4 runs → 2 even, 2 odd → 最頻値の頻度 = 2/4 = 0.5
    expect(result.exactMatchRate).toBe(0.5);
  });

  it("validate を渡すと schemaConformanceRate を計測", async () => {
    const result = await runConsistencyCheck({
      producer: async () => ({ value: "x" }),
      validate: () => false,
      runs: 3,
    });
    expect(result.schemaConformanceRate).toBe(0);
  });

  it("modal は最頻値を返す", async () => {
    const seq = [{ v: "a" }, { v: "a" }, { v: "b" }, { v: "a" }, { v: "b" }];
    let i = 0;
    const result = await runConsistencyCheck({
      producer: async () => {
        const value = seq[i] as (typeof seq)[number];
        i += 1;
        return value;
      },
      runs: 5,
    });
    expect(result.modal).toEqual({ v: "a" });
    expect(result.exactMatchRate).toBe(0.6);
  });
});

describe("expectMatchRate", () => {
  it("閾値を満たすと throw しない", async () => {
    const result = await runConsistencyCheck({
      producer: async () => ({ x: 1 }),
      runs: 3,
    });
    expect(() => expectMatchRate(result, { minExactMatchRate: 0.8 })).not.toThrow();
  });

  it("閾値を割ると ConsistencyAssertionError を投げる", async () => {
    let i = 0;
    const result = await runConsistencyCheck({
      producer: async () => ({ x: ++i }),
      runs: 4,
    });
    expect(() => expectMatchRate(result, { minExactMatchRate: 0.9 })).toThrow(
      ConsistencyAssertionError,
    );
  });

  it("schemaConformanceRate も閾値チェックされる", async () => {
    const result = await runConsistencyCheck({
      producer: async () => ({ x: 1 }),
      validate: () => false,
      runs: 3,
    });
    expect(() => expectMatchRate(result, { minSchemaConformance: 1.0 })).toThrow(
      ConsistencyAssertionError,
    );
  });
});
