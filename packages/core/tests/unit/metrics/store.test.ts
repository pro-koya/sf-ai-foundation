import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MetricsStore, summarize } from "../../../src/metrics/index.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "yohaku-metrics-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("MetricsStore", () => {
  it("空ファイルなら EMPTY_METRICS を返す", () => {
    const store = new MetricsStore({ rootPath: tmpRoot });
    const metrics = store.read();
    expect(metrics.events).toEqual([]);
    expect(metrics.totals.tokens).toBe(0);
  });

  it("record でイベントを追加し totals が更新される", () => {
    const store = new MetricsStore({ rootPath: tmpRoot });
    store.record({
      model: "claude-sonnet-4-6",
      command: "/onboard",
      tokensIn: 1000,
      tokensOut: 500,
    });
    const metrics = store.read();
    expect(metrics.events).toHaveLength(1);
    expect(metrics.totals.tokensIn).toBe(1000);
    expect(metrics.totals.tokensOut).toBe(500);
    expect(metrics.totals.tokens).toBe(1500);
    expect(metrics.totals.estimatedCostUsd).toBeGreaterThan(0);
  });

  it("複数 record で累積される", () => {
    const store = new MetricsStore({ rootPath: tmpRoot });
    store.record({ model: "claude-haiku-4-5", command: "/explain", tokensIn: 200, tokensOut: 100 });
    store.record({
      model: "claude-sonnet-4-6",
      command: "/onboard",
      tokensIn: 1000,
      tokensOut: 500,
    });
    const metrics = store.read();
    expect(metrics.events).toHaveLength(2);
    expect(metrics.totals.events).toBe(2);
    expect(metrics.totals.tokens).toBe(1800);
  });

  it("modelKind が推論される", () => {
    const store = new MetricsStore({ rootPath: tmpRoot });
    const event = store.record({
      model: "claude-haiku-4-5",
      command: "x",
      tokensIn: 1,
      tokensOut: 1,
    });
    expect(event.modelKind).toBe("haiku");
  });
});

describe("summarize", () => {
  it("period=all で全件を集計", () => {
    const store = new MetricsStore({ rootPath: tmpRoot });
    store.record({ model: "claude-sonnet-4-6", command: "/onboard", tokensIn: 100, tokensOut: 50 });
    store.record({
      model: "claude-sonnet-4-6",
      command: "/explain",
      tokensIn: 200,
      tokensOut: 100,
    });
    const summary = summarize(store.read(), "all");
    expect(summary.totals.events).toBe(2);
    expect(summary.byCommand.size).toBe(2);
  });

  it("period=day で 24h 以内のみ集計", () => {
    const store = new MetricsStore({ rootPath: tmpRoot });
    // すべて今追加したものは 24h 以内なので含まれる
    store.record({ model: "claude-haiku-4-5", command: "/x", tokensIn: 10, tokensOut: 5 });
    const summary = summarize(store.read(), "day");
    expect(summary.totals.events).toBe(1);
  });

  it("byModel / byCommand でグループ化", () => {
    const store = new MetricsStore({ rootPath: tmpRoot });
    store.record({ model: "claude-sonnet-4-6", command: "/a", tokensIn: 100, tokensOut: 50 });
    store.record({ model: "claude-haiku-4-5", command: "/a", tokensIn: 200, tokensOut: 100 });
    store.record({ model: "claude-sonnet-4-6", command: "/b", tokensIn: 300, tokensOut: 150 });
    const summary = summarize(store.read(), "all");
    expect(summary.byModel.size).toBe(2);
    expect(summary.byCommand.size).toBe(2);
    expect(summary.byCommand.get("/a")?.events).toBe(2);
  });
});
