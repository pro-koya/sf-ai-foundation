import { describe, expect, it } from "vitest";
import { findBlockById, parseDocument, replaceBlockContent } from "../../../src/merge/parser.js";

describe("parseDocument", () => {
  it("3 種ブロックを抽出する", () => {
    const md = [
      "# Account",
      "",
      '<!-- DETERMINISTIC_START id="overview" -->',
      "x",
      '<!-- DETERMINISTIC_END id="overview" -->',
      "",
      '<!-- HUMAN_MANAGED_START id="ctx" -->',
      "y",
      '<!-- HUMAN_MANAGED_END id="ctx" -->',
    ].join("\n");
    const doc = parseDocument("test.md", md);
    expect(doc.blocks).toHaveLength(2);
    expect(doc.blocks[0]?.kind).toBe("deterministic");
    expect(doc.blocks[0]?.id).toBe("overview");
    expect(doc.blocks[1]?.kind).toBe("human_managed");
  });

  it("マーカーが無い場合は blocks が空、prelude に全文", () => {
    const doc = parseDocument("plain.md", "# Hello\nWorld");
    expect(doc.blocks).toHaveLength(0);
    expect(doc.preludeBeforeFirstMarker).toBe("# Hello\nWorld");
  });
});

describe("findBlockById", () => {
  it("kind と id で一致するブロックを返す", () => {
    const blocks = [
      { kind: "human_managed" as const, id: "a", content: "X" },
      { kind: "human_managed" as const, id: "b", content: "Y" },
    ];
    expect(findBlockById(blocks, "human_managed", "b")?.content).toBe("Y");
    expect(findBlockById(blocks, "human_managed", "z")).toBeUndefined();
  });
});

describe("replaceBlockContent", () => {
  it("指定ブロックの中身を置き換える", () => {
    const src = '<!-- HUMAN_MANAGED_START id="ctx" -->\nold\n<!-- HUMAN_MANAGED_END id="ctx" -->';
    const out = replaceBlockContent(src, "human_managed", "ctx", "\nnew\n");
    expect(out).toContain("\nnew\n");
    expect(out).not.toContain("\nold\n");
  });
});
