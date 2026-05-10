import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SfdxProjectError, readSfdxProject } from "../../../src/adapters/local/sfdx-project.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "sfai-sfdx-"));
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

function writeProjectJson(content: unknown): void {
  writeFileSync(join(tmpRoot, "sfdx-project.json"), JSON.stringify(content));
}

describe("readSfdxProject", () => {
  it("sfdx-project.json が無ければ default の force-app を返す", () => {
    const config = readSfdxProject(tmpRoot);
    expect(config.packageDirectories).toEqual([{ path: "force-app", default: true }]);
  });

  it("packageDirectories を読み取る", () => {
    writeProjectJson({
      packageDirectories: [{ path: "force-app", default: true }, { path: "extra-pkg" }],
      sourceApiVersion: "62.0",
    });
    const config = readSfdxProject(tmpRoot);
    expect(config.packageDirectories).toHaveLength(2);
    expect(config.packageDirectories[0]?.path).toBe("force-app");
    expect(config.packageDirectories[1]?.path).toBe("extra-pkg");
    expect(config.sourceApiVersion).toBe("62.0");
  });

  it("default 指定が無ければ先頭を default に昇格させる", () => {
    writeProjectJson({
      packageDirectories: [{ path: "pkg-a" }, { path: "pkg-b" }],
    });
    const config = readSfdxProject(tmpRoot);
    expect(config.packageDirectories[0]).toEqual({ path: "pkg-a", default: true });
    expect(config.packageDirectories[1]).toEqual({ path: "pkg-b", default: false });
  });

  it("空配列ならフォールバック", () => {
    writeProjectJson({ packageDirectories: [] });
    const config = readSfdxProject(tmpRoot);
    expect(config.packageDirectories).toEqual([{ path: "force-app", default: true }]);
  });

  it("不正な JSON は SfdxProjectError", () => {
    writeFileSync(join(tmpRoot, "sfdx-project.json"), "{ not json");
    expect(() => readSfdxProject(tmpRoot)).toThrow(SfdxProjectError);
  });

  it("packageDirectories が無ければデフォルトを使う", () => {
    writeProjectJson({ name: "my-project" });
    const config = readSfdxProject(tmpRoot);
    expect(config.packageDirectories).toEqual([{ path: "force-app", default: true }]);
  });
});

describe("LocalSourceAdapter — package directories integration", () => {
  it("複数パッケージディレクトリのファイルを取得する", async () => {
    const { LocalSourceAdapter } = await import(
      "../../../src/adapters/local/local-source-adapter.js"
    );

    mkdirSync(join(tmpRoot, "pkg-a/main/default/objects/Account"), { recursive: true });
    mkdirSync(join(tmpRoot, "pkg-b/main/default/objects/Custom__c"), { recursive: true });
    writeFileSync(
      join(tmpRoot, "pkg-a/main/default/objects/Account/Account.object-meta.xml"),
      '<?xml version="1.0" encoding="UTF-8"?><CustomObject><label>Account</label></CustomObject>',
    );
    writeFileSync(
      join(tmpRoot, "pkg-b/main/default/objects/Custom__c/Custom__c.object-meta.xml"),
      '<?xml version="1.0" encoding="UTF-8"?><CustomObject><label>Custom</label></CustomObject>',
    );
    writeProjectJson({
      packageDirectories: [{ path: "pkg-a", default: true }, { path: "pkg-b" }],
    });

    const adapter = new LocalSourceAdapter({ rootPath: tmpRoot });
    const list = await adapter.list();
    const fqns = list.map((d) => d.fullyQualifiedName);
    expect(fqns).toContain("Account");
    expect(fqns).toContain("Custom__c");
    expect(adapter.packageDirectories).toEqual(["pkg-a", "pkg-b"]);
  });

  it("オプションでの packageDirectories 上書きが優先される", async () => {
    const { LocalSourceAdapter } = await import(
      "../../../src/adapters/local/local-source-adapter.js"
    );
    writeProjectJson({
      packageDirectories: [{ path: "force-app", default: true }],
    });
    const adapter = new LocalSourceAdapter({
      rootPath: tmpRoot,
      packageDirectories: ["custom-dir"],
    });
    expect(adapter.packageDirectories).toEqual(["custom-dir"]);
  });
});
