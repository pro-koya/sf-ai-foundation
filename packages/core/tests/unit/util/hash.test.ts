import { describe, expect, it } from "vitest";
import { combineHashes, sha256 } from "../../../src/util/hash.js";

describe("sha256", () => {
  it("同一入力に対して同一ハッシュ", () => {
    expect(sha256("hello")).toBe(sha256("hello"));
  });
  it("異なる入力で異なるハッシュ", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });
  it("プレフィックス sha256:", () => {
    expect(sha256("x")).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe("combineHashes", () => {
  it("入力順序に依存しない (sort-based)", () => {
    expect(combineHashes(["a", "b", "c"])).toBe(combineHashes(["c", "b", "a"]));
  });
  it("内容が変われば変わる", () => {
    expect(combineHashes(["a"])).not.toBe(combineHashes(["b"]));
  });
});
