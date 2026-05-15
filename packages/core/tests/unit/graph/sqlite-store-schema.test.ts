import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteGraphStore } from "../../../src/graph/sqlite-store.js";

describe("SqliteGraphStore — getTableSchemas / suggestion helpers", () => {
  let dir: string;
  let dbPath: string;
  let store: SqliteGraphStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "yohaku-schema-test-"));
    dbPath = join(dir, "graph.sqlite");
    // 書き込みモードで一度開いて SCHEMA_DDL を反映、その後そのまま利用
    store = new SqliteGraphStore({ dbPath });
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("getTableSchemas() returns all knowledge graph tables in snake_case", () => {
    const schemas = store.getTableSchemas();
    const tableNames = schemas.map((s) => s.table);
    expect(tableNames).toContain("objects");
    expect(tableNames).toContain("apex_triggers");
    expect(tableNames).toContain("flows");
    expect(tableNames).toContain("validation_rules");
    expect(tableNames).not.toContain("sqlite_master"); // システムテーブルは除外
  });

  it("objects table exposes fqn / label / is_custom (not camelCase)", () => {
    const [objects] = store.getTableSchemas("objects");
    if (!objects) throw new Error("objects schema missing");
    const colNames = objects.columns.map((c) => c.name);
    expect(colNames).toContain("fqn");
    expect(colNames).toContain("label");
    expect(colNames).toContain("is_custom");
    expect(colNames).not.toContain("fullyQualifiedName");

    const fqn = objects.columns.find((c) => c.name === "fqn");
    if (!fqn) throw new Error("fqn column missing");
    expect(fqn.primaryKey).toBe(true);
    expect(fqn.type).toBe("TEXT");
  });

  it("apex_triggers has events_json (not events)", () => {
    const [t] = store.getTableSchemas("apex_triggers");
    if (!t) throw new Error("apex_triggers schema missing");
    const colNames = t.columns.map((c) => c.name);
    expect(colNames).toContain("events_json");
    expect(colNames).not.toContain("events");
  });

  it("flows has triggering_object (not triggeringObject)", () => {
    const [t] = store.getTableSchemas("flows");
    if (!t) throw new Error("flows schema missing");
    const colNames = t.columns.map((c) => c.name);
    expect(colNames).toContain("triggering_object");
    expect(colNames).not.toContain("triggeringObject");
  });

  it("getTableSchemas(unknown) throws with helpful message listing available tables", () => {
    expect(() => store.getTableSchemas("nonexistent_table")).toThrow(
      /No such table: nonexistent_table/,
    );
    expect(() => store.getTableSchemas("nonexistent_table")).toThrow(/objects/);
  });

  it("getAllColumnNames() includes core fields and is deduplicated", () => {
    const cols = store.getAllColumnNames();
    expect(cols).toContain("fqn");
    expect(cols).toContain("triggering_object");
    expect(cols).toContain("events_json");
    // 重複なし
    expect(new Set(cols).size).toBe(cols.length);
  });

  it("getAllTableNames() excludes sqlite_* system tables", () => {
    const names = store.getAllTableNames();
    expect(names).toContain("objects");
    expect(names.every((n) => !n.startsWith("sqlite_"))).toBe(true);
  });
});
