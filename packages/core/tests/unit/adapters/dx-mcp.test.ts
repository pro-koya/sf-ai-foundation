import { describe, expect, it } from "vitest";
import {
  DxMcpNotImplementedError,
  DxMcpSourceAdapter,
} from "../../../src/adapters/dx-mcp/index.js";

describe("DxMcpSourceAdapter (Phase 6 stub)", () => {
  it("kind は 'dx-mcp'", () => {
    const a = new DxMcpSourceAdapter();
    expect(a.kind).toBe("dx-mcp");
  });

  it("options を保持", () => {
    const a = new DxMcpSourceAdapter({ orgAlias: "yohaku-dev", apiVersion: "62.0" });
    expect(a.options.orgAlias).toBe("yohaku-dev");
    expect(a.options.apiVersion).toBe("62.0");
  });

  it("list は DxMcpNotImplementedError を投げる (Phase 6 stub)", async () => {
    const a = new DxMcpSourceAdapter();
    await expect(a.list()).rejects.toThrow(DxMcpNotImplementedError);
  });

  it("loadContent は DxMcpNotImplementedError を投げる", async () => {
    const a = new DxMcpSourceAdapter();
    await expect(
      a.loadContent({
        type: "CustomObject",
        fullyQualifiedName: "Account",
        sourcePath: "<dx-mcp>",
        contentHash: "sha256:x",
      }),
    ).rejects.toThrow(DxMcpNotImplementedError);
  });

  it("computeSourceHash は DxMcpNotImplementedError を投げる", async () => {
    const a = new DxMcpSourceAdapter();
    await expect(a.computeSourceHash()).rejects.toThrow(DxMcpNotImplementedError);
  });

  it("エラーメッセージに Phase 7 で本実装予定が含まれる", async () => {
    const a = new DxMcpSourceAdapter();
    try {
      await a.list();
      expect.fail("should throw");
    } catch (err) {
      expect((err as Error).message).toMatch(/Phase 7/);
      expect((err as Error).message).toMatch(/--source local/);
    }
  });
});
