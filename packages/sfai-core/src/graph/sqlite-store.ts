import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import type { KnowledgeGraph } from "../types/graph.js";

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS objects (
  fqn TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  plural_label TEXT,
  description TEXT,
  is_custom INTEGER NOT NULL,
  sharing_model TEXT,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS fields (
  fqn TEXT PRIMARY KEY,
  object TEXT NOT NULL,
  label TEXT,
  description TEXT,
  type TEXT NOT NULL,
  required INTEGER,
  is_unique INTEGER,
  is_custom INTEGER NOT NULL,
  reference_to_json TEXT,
  picklist_values_json TEXT,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  FOREIGN KEY (object) REFERENCES objects(fqn) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fields_object ON fields(object);

CREATE TABLE IF NOT EXISTS validation_rules (
  fqn TEXT PRIMARY KEY,
  object TEXT NOT NULL,
  active INTEGER NOT NULL,
  error_condition_formula TEXT,
  error_message TEXT,
  error_display_field TEXT,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vr_object ON validation_rules(object);

CREATE TABLE IF NOT EXISTS flows (
  fqn TEXT PRIMARY KEY,
  label TEXT,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  triggering_object TEXT,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  body_json TEXT
);

CREATE TABLE IF NOT EXISTS apex_classes (
  fqn TEXT PRIMARY KEY,
  api_version TEXT NOT NULL,
  is_test INTEGER NOT NULL,
  is_interface INTEGER,
  is_abstract INTEGER,
  lines_of_code INTEGER,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  body_json TEXT
);

CREATE TABLE IF NOT EXISTS apex_triggers (
  fqn TEXT PRIMARY KEY,
  object TEXT NOT NULL,
  events_json TEXT NOT NULL,
  api_version TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  body_json TEXT
);

CREATE TABLE IF NOT EXISTS permission_sets (
  fqn TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  license TEXT,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  body_json TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  fqn TEXT PRIMARY KEY,
  user_license TEXT,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  body_json TEXT
);

CREATE TABLE IF NOT EXISTS record_types (
  fqn TEXT PRIMARY KEY,
  object TEXT NOT NULL,
  label TEXT,
  description TEXT,
  active INTEGER NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  FOREIGN KEY (object) REFERENCES objects(fqn) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rt_object ON record_types(object);

CREATE TABLE IF NOT EXISTS approval_processes (
  fqn TEXT PRIMARY KEY,
  object TEXT NOT NULL,
  label TEXT,
  description TEXT,
  active INTEGER NOT NULL,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  FOREIGN KEY (object) REFERENCES objects(fqn) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ap_object ON approval_processes(object);

CREATE TABLE IF NOT EXISTS sharing_rules (
  fqn TEXT PRIMARY KEY,
  object TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT,
  description TEXT,
  access_level TEXT NOT NULL,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  FOREIGN KEY (object) REFERENCES objects(fqn) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sr_object ON sharing_rules(object);

CREATE TABLE IF NOT EXISTS layouts (
  fqn TEXT PRIMARY KEY,
  object TEXT NOT NULL,
  layout_name TEXT NOT NULL,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  FOREIGN KEY (object) REFERENCES objects(fqn) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_layout_object ON layouts(object);

CREATE TABLE IF NOT EXISTS custom_metadata_records (
  fqn TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  record_name TEXT NOT NULL,
  label TEXT,
  is_protected INTEGER,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cmr_type ON custom_metadata_records(type);

CREATE TABLE IF NOT EXISTS named_credentials (
  fqn TEXT PRIMARY KEY,
  label TEXT,
  endpoint TEXT,
  principal_type TEXT,
  protocol TEXT,
  has_secret INTEGER NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS remote_site_settings (
  fqn TEXT PRIMARY KEY,
  url TEXT,
  description TEXT,
  active INTEGER NOT NULL,
  disable_protocol_security INTEGER NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lwcs (
  fqn TEXT PRIMARY KEY,
  api_version TEXT,
  master_label TEXT,
  description TEXT,
  is_exposed INTEGER NOT NULL,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aura_bundles (
  fqn TEXT PRIMARY KEY,
  bundle_kind TEXT NOT NULL,
  api_version TEXT,
  description TEXT,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS flexi_pages (
  fqn TEXT PRIMARY KEY,
  type TEXT,
  sobject_type TEXT,
  page_template TEXT,
  master_label TEXT,
  description TEXT,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS visualforce_pages (
  fqn TEXT PRIMARY KEY,
  api_version TEXT,
  label TEXT,
  description TEXT,
  controller TEXT,
  standard_controller TEXT,
  render_as TEXT,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS visualforce_components (
  fqn TEXT PRIMARY KEY,
  api_version TEXT,
  label TEXT,
  description TEXT,
  controller TEXT,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_applications (
  fqn TEXT PRIMARY KEY,
  label TEXT,
  description TEXT,
  nav_type TEXT,
  body_json TEXT NOT NULL,
  source_path TEXT NOT NULL,
  content_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_kind TEXT NOT NULL,
  from_fqn TEXT NOT NULL,
  to_kind TEXT NOT NULL,
  to_fqn TEXT NOT NULL,
  kind TEXT NOT NULL,
  evidence_path TEXT
);
CREATE INDEX IF NOT EXISTS idx_deps_from ON dependencies(from_kind, from_fqn);
CREATE INDEX IF NOT EXISTS idx_deps_to ON dependencies(to_kind, to_fqn);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_kind TEXT NOT NULL,
  entity_fqn TEXT NOT NULL,
  namespace TEXT NOT NULL,
  value TEXT NOT NULL
);
`;

const TRUNCATE_DDL = `
DELETE FROM dependencies;
DELETE FROM tags;
DELETE FROM custom_applications;
DELETE FROM visualforce_components;
DELETE FROM visualforce_pages;
DELETE FROM flexi_pages;
DELETE FROM aura_bundles;
DELETE FROM lwcs;
DELETE FROM remote_site_settings;
DELETE FROM named_credentials;
DELETE FROM custom_metadata_records;
DELETE FROM layouts;
DELETE FROM sharing_rules;
DELETE FROM approval_processes;
DELETE FROM record_types;
DELETE FROM fields;
DELETE FROM validation_rules;
DELETE FROM apex_triggers;
DELETE FROM apex_classes;
DELETE FROM flows;
DELETE FROM permission_sets;
DELETE FROM profiles;
DELETE FROM objects;
DELETE FROM meta;
`;

export interface SqliteStoreOptions {
  readonly dbPath: string;
}

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  type: string,
): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (rows.some((r) => r.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

export class SqliteGraphStore {
  readonly #db: Database.Database;

  constructor(options: SqliteStoreOptions) {
    mkdirSync(dirname(options.dbPath), { recursive: true });
    this.#db = new Database(options.dbPath);
    this.#db.pragma("journal_mode = WAL");
    this.#db.pragma("foreign_keys = ON");
    this.#db.exec(SCHEMA_DDL);
    this.#migrate();
  }

  #migrate(): void {
    addColumnIfMissing(this.#db, "flows", "body_json", "TEXT");
    addColumnIfMissing(this.#db, "apex_classes", "body_json", "TEXT");
    addColumnIfMissing(this.#db, "apex_triggers", "body_json", "TEXT");
    addColumnIfMissing(this.#db, "permission_sets", "body_json", "TEXT");
    addColumnIfMissing(this.#db, "profiles", "body_json", "TEXT");
  }

  close(): void {
    this.#db.close();
  }

  query<T = unknown>(sql: string, params: readonly unknown[] = []): readonly T[] {
    return this.#db.prepare(sql).all(...params) as T[];
  }

  writeAll(graph: KnowledgeGraph, mode: "full" | "incremental"): void {
    const tx = this.#db.transaction(() => {
      if (mode === "full") this.#db.exec(TRUNCATE_DDL);
      this.writeMeta(graph);
      this.writeObjects(graph);
      this.writeFields(graph);
      this.writeValidationRules(graph);
      this.writeFlows(graph);
      this.writeApexClasses(graph);
      this.writeApexTriggers(graph);
      this.writePermissionSets(graph);
      this.writeProfiles(graph);
      this.writeRecordTypes(graph);
      this.writeApprovalProcesses(graph);
      this.writeSharingRules(graph);
      this.writeLayouts(graph);
      this.writeCustomMetadataRecords(graph);
      this.writeNamedCredentials(graph);
      this.writeRemoteSiteSettings(graph);
      this.writeLwcs(graph);
      this.writeAuraBundles(graph);
      this.writeFlexiPages(graph);
      this.writeVisualforcePages(graph);
      this.writeVisualforceComponents(graph);
      this.writeCustomApplications(graph);
      this.writeDependencies(graph);
      this.writeTags(graph);
    });
    tx();
  }

  private writeMeta(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare("INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)");
    stmt.run("sfai_version", graph.meta.sfaiVersion);
    stmt.run("built_at", graph.meta.builtAt);
    stmt.run("source_adapter", graph.meta.sourceAdapter);
    stmt.run("salesforce_api_version", graph.meta.salesforceApiVersion);
    stmt.run("source_hash", graph.meta.sourceHash);
  }

  private writeObjects(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO objects(fqn, label, plural_label, description, is_custom, sharing_model, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (const o of graph.objects) {
      stmt.run(
        o.fullyQualifiedName,
        o.label,
        o.pluralLabel ?? null,
        o.description ?? null,
        o.isCustom ? 1 : 0,
        o.sharingModel ?? null,
        o.sourcePath,
        o.contentHash,
      );
    }
  }

  private writeFields(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO fields(fqn, object, label, description, type, required, is_unique, is_custom, reference_to_json, picklist_values_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    for (const f of graph.fields) {
      stmt.run(
        f.fullyQualifiedName,
        f.object,
        f.label ?? null,
        f.description ?? null,
        f.type,
        f.required === undefined ? null : f.required ? 1 : 0,
        f.unique === undefined ? null : f.unique ? 1 : 0,
        f.isCustom ? 1 : 0,
        f.referenceTo === undefined ? null : JSON.stringify(f.referenceTo),
        f.picklistValues === undefined ? null : JSON.stringify(f.picklistValues),
        f.sourcePath,
        f.contentHash,
      );
    }
  }

  private writeValidationRules(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO validation_rules(fqn, object, active, error_condition_formula, error_message, error_display_field, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (const v of graph.validationRules) {
      stmt.run(
        v.fullyQualifiedName,
        v.object,
        v.active ? 1 : 0,
        v.errorConditionFormula ?? null,
        v.errorMessage ?? null,
        v.errorDisplayField ?? null,
        v.sourcePath,
        v.contentHash,
      );
    }
  }

  private writeFlows(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO flows(fqn, label, description, type, status, triggering_object, source_path, content_hash, body_json) VALUES (?,?,?,?,?,?,?,?,?)",
    );
    for (const f of graph.flows) {
      stmt.run(
        f.fullyQualifiedName,
        f.label ?? null,
        f.description ?? null,
        f.type,
        f.status,
        f.triggeringObject ?? null,
        f.sourcePath,
        f.contentHash,
        f.body === undefined ? null : JSON.stringify(f.body),
      );
    }
  }

  private writeApexClasses(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO apex_classes(fqn, api_version, is_test, is_interface, is_abstract, lines_of_code, source_path, content_hash, body_json) VALUES (?,?,?,?,?,?,?,?,?)",
    );
    for (const c of graph.apexClasses) {
      stmt.run(
        c.fullyQualifiedName,
        c.apiVersion,
        c.isTest ? 1 : 0,
        c.isInterface === undefined ? null : c.isInterface ? 1 : 0,
        c.isAbstract === undefined ? null : c.isAbstract ? 1 : 0,
        c.linesOfCode ?? null,
        c.sourcePath,
        c.contentHash,
        c.body === undefined ? null : JSON.stringify(c.body),
      );
    }
  }

  private writeApexTriggers(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO apex_triggers(fqn, object, events_json, api_version, source_path, content_hash, body_json) VALUES (?,?,?,?,?,?,?)",
    );
    for (const t of graph.apexTriggers) {
      stmt.run(
        t.fullyQualifiedName,
        t.object,
        JSON.stringify(t.events),
        t.apiVersion,
        t.sourcePath,
        t.contentHash,
        t.body === undefined ? null : JSON.stringify(t.body),
      );
    }
  }

  private writePermissionSets(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO permission_sets(fqn, label, description, license, source_path, content_hash, body_json) VALUES (?,?,?,?,?,?,?)",
    );
    for (const p of graph.permissionSets) {
      stmt.run(
        p.fullyQualifiedName,
        p.label,
        p.description ?? null,
        p.license ?? null,
        p.sourcePath,
        p.contentHash,
        p.body === undefined ? null : JSON.stringify(p.body),
      );
    }
  }

  private writeProfiles(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO profiles(fqn, user_license, source_path, content_hash, body_json) VALUES (?,?,?,?,?)",
    );
    for (const p of graph.profiles) {
      stmt.run(
        p.fullyQualifiedName,
        p.userLicense ?? null,
        p.sourcePath,
        p.contentHash,
        p.body === undefined ? null : JSON.stringify(p.body),
      );
    }
  }

  private writeRecordTypes(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO record_types(fqn, object, label, description, active, source_path, content_hash) VALUES (?,?,?,?,?,?,?)",
    );
    for (const r of graph.recordTypes) {
      stmt.run(
        r.fullyQualifiedName,
        r.object,
        r.label ?? null,
        r.description ?? null,
        r.active ? 1 : 0,
        r.sourcePath,
        r.contentHash,
      );
    }
  }

  private writeApprovalProcesses(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO approval_processes(fqn, object, label, description, active, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (const a of graph.approvalProcesses) {
      const body = {
        entryCriteria: a.entryCriteria,
        steps: a.steps,
        initialSubmissionActions: a.initialSubmissionActions,
        finalApprovalActions: a.finalApprovalActions,
        finalRejectionActions: a.finalRejectionActions,
        recallActions: a.recallActions,
        recordEditability: a.recordEditability,
      };
      stmt.run(
        a.fullyQualifiedName,
        a.object,
        a.label ?? null,
        a.description ?? null,
        a.active ? 1 : 0,
        JSON.stringify(body),
        a.sourcePath,
        a.contentHash,
      );
    }
  }

  private writeLayouts(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO layouts(fqn, object, layout_name, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?)",
    );
    for (const l of graph.layouts) {
      const body = {
        sections: l.sections,
        relatedLists: l.relatedLists,
        quickActions: l.quickActions,
      };
      stmt.run(
        l.fullyQualifiedName,
        l.object,
        l.layoutName,
        JSON.stringify(body),
        l.sourcePath,
        l.contentHash,
      );
    }
  }

  private writeCustomMetadataRecords(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO custom_metadata_records(fqn, type, record_name, label, is_protected, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (const r of graph.customMetadataRecords) {
      stmt.run(
        r.fullyQualifiedName,
        r.type,
        r.recordName,
        r.label ?? null,
        r.protected === undefined ? null : r.protected ? 1 : 0,
        JSON.stringify({ values: r.values }),
        r.sourcePath,
        r.contentHash,
      );
    }
  }

  private writeNamedCredentials(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO named_credentials(fqn, label, endpoint, principal_type, protocol, has_secret, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (const n of graph.namedCredentials) {
      stmt.run(
        n.fullyQualifiedName,
        n.label ?? null,
        n.endpoint ?? null,
        n.principalType ?? null,
        n.protocol ?? null,
        n.hasSecret ? 1 : 0,
        n.sourcePath,
        n.contentHash,
      );
    }
  }

  private writeLwcs(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO lwcs(fqn, api_version, master_label, description, is_exposed, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (const c of graph.lwcs) {
      const body = {
        targets: c.targets,
        hasHtml: c.hasHtml,
        hasCss: c.hasCss,
        apexImports: c.apexImports,
        labelImports: c.labelImports,
        publicProperties: c.publicProperties,
        wires: c.wires,
        customEvents: c.customEvents,
        childComponents: c.childComponents,
        standardComponents: c.standardComponents,
        directives: c.directives,
      };
      stmt.run(
        c.fullyQualifiedName,
        c.apiVersion ?? null,
        c.masterLabel ?? null,
        c.description ?? null,
        c.isExposed ? 1 : 0,
        JSON.stringify(body),
        c.sourcePath,
        c.contentHash,
      );
    }
  }

  private writeAuraBundles(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO aura_bundles(fqn, bundle_kind, api_version, description, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?)",
    );
    for (const a of graph.auraBundles) {
      const body = {
        hasController: a.hasController,
        hasHelper: a.hasHelper,
        hasRenderer: a.hasRenderer,
        hasStyle: a.hasStyle,
        attributes: a.attributes,
        handlers: a.handlers,
      };
      stmt.run(
        a.fullyQualifiedName,
        a.bundleKind,
        a.apiVersion ?? null,
        a.description ?? null,
        JSON.stringify(body),
        a.sourcePath,
        a.contentHash,
      );
    }
  }

  private writeFlexiPages(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO flexi_pages(fqn, type, sobject_type, page_template, master_label, description, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?,?)",
    );
    for (const f of graph.flexiPages) {
      stmt.run(
        f.fullyQualifiedName,
        f.type ?? null,
        f.sobjectType ?? null,
        f.pageTemplate ?? null,
        f.masterLabel ?? null,
        f.description ?? null,
        JSON.stringify({ regions: f.regions }),
        f.sourcePath,
        f.contentHash,
      );
    }
  }

  private writeVisualforcePages(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO visualforce_pages(fqn, api_version, label, description, controller, standard_controller, render_as, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?,?,?)",
    );
    for (const p of graph.visualforcePages) {
      const body = {
        extensions: p.extensions,
        availableInTouch: p.availableInTouch,
        confirmationTokenRequired: p.confirmationTokenRequired,
        hasMarkup: p.hasMarkup,
        markupCounts: p.markupCounts,
        methodReferences: p.methodReferences,
      };
      stmt.run(
        p.fullyQualifiedName,
        p.apiVersion ?? null,
        p.label ?? null,
        p.description ?? null,
        p.controller ?? null,
        p.standardController ?? null,
        p.renderAs ?? null,
        JSON.stringify(body),
        p.sourcePath,
        p.contentHash,
      );
    }
  }

  private writeVisualforceComponents(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO visualforce_components(fqn, api_version, label, description, controller, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (const c of graph.visualforceComponents) {
      const body = {
        attributes: c.attributes,
        hasMarkup: c.hasMarkup,
        markupCounts: c.markupCounts,
      };
      stmt.run(
        c.fullyQualifiedName,
        c.apiVersion ?? null,
        c.label ?? null,
        c.description ?? null,
        c.controller ?? null,
        JSON.stringify(body),
        c.sourcePath,
        c.contentHash,
      );
    }
  }

  private writeCustomApplications(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO custom_applications(fqn, label, description, nav_type, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?)",
    );
    for (const a of graph.customApplications) {
      const body = {
        formFactors: a.formFactors,
        tabs: a.tabs,
        utilityBar: a.utilityBar,
        brandColor: a.brandColor,
        logo: a.logo,
      };
      stmt.run(
        a.fullyQualifiedName,
        a.label ?? null,
        a.description ?? null,
        a.navType ?? null,
        JSON.stringify(body),
        a.sourcePath,
        a.contentHash,
      );
    }
  }

  private writeRemoteSiteSettings(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO remote_site_settings(fqn, url, description, active, disable_protocol_security, source_path, content_hash) VALUES (?,?,?,?,?,?,?)",
    );
    for (const r of graph.remoteSiteSettings) {
      stmt.run(
        r.fullyQualifiedName,
        r.url ?? null,
        r.description ?? null,
        r.active ? 1 : 0,
        r.disableProtocolSecurity ? 1 : 0,
        r.sourcePath,
        r.contentHash,
      );
    }
  }

  private writeSharingRules(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT OR REPLACE INTO sharing_rules(fqn, object, kind, label, description, access_level, body_json, source_path, content_hash) VALUES (?,?,?,?,?,?,?,?,?)",
    );
    for (const r of graph.sharingRules) {
      const body = {
        sharedTo: r.sharedTo,
        criteriaItems: r.criteriaItems,
        criteriaBooleanFilter: r.criteriaBooleanFilter,
        ownerSource: r.ownerSource,
      };
      stmt.run(
        r.fullyQualifiedName,
        r.object,
        r.kind,
        r.label ?? null,
        r.description ?? null,
        r.accessLevel,
        JSON.stringify(body),
        r.sourcePath,
        r.contentHash,
      );
    }
  }

  private writeDependencies(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT INTO dependencies(from_kind, from_fqn, to_kind, to_fqn, kind, evidence_path) VALUES (?,?,?,?,?,?)",
    );
    for (const d of graph.dependencies) {
      stmt.run(
        d.from.kind,
        d.from.fullyQualifiedName,
        d.to.kind,
        d.to.fullyQualifiedName,
        d.kind,
        d.evidencePath ?? null,
      );
    }
  }

  private writeTags(graph: KnowledgeGraph): void {
    const stmt = this.#db.prepare(
      "INSERT INTO tags(entity_kind, entity_fqn, namespace, value) VALUES (?,?,?,?)",
    );
    for (const t of graph.tags) {
      stmt.run(t.entity.kind, t.entity.fullyQualifiedName, t.namespace, t.value);
    }
  }
}
