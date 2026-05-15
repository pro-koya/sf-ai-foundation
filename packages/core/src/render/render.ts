import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { mergeRender } from "../merge/index.js";
import type { KnowledgeGraph, SObject } from "../types/graph.js";
import type { MergeWarning } from "../types/render.js";
import { buildApprovalMermaid } from "./approval-mermaid.js";
import { archiveDeleted } from "./archive.js";
import { concernsForApex, concernsForFlow, concernsForTrigger } from "./concerns.js";
import { buildErDiagram } from "./er-diagram.js";
import { renderEta } from "./eta-engine.js";
import { buildFlowFlowchart } from "./flow-flowchart.js";
import { buildFlowSequenceTable } from "./flow-sequence-table.js";
import { formulaToNaturalLanguage } from "./formula.js";
import { buildIntraClassCallGraph } from "./intra-class-call-graph.js";
import { buildSystemOverviewMermaid, buildTriggerMermaid } from "./mermaid.js";
import { buildMethodFlowchart } from "./method-flowchart.js";
import { buildMethodSummaryTable } from "./method-summary-table.js";
import {
  summaryForApex,
  summaryForApexTrigger,
  summaryForApprovalProcess,
  summaryForAuraBundle,
  summaryForCustomApplication,
  summaryForCustomMetadataRecord,
  summaryForFlexiPage,
  summaryForFlow,
  summaryForLayout,
  summaryForLwc,
  summaryForNamedCredential,
  summaryForPermissionSet,
  summaryForProfile,
  summaryForRecordType,
  summaryForRemoteSiteSetting,
  summaryForSharingRule,
  summaryForValidationRule,
  summaryForVisualforceComponent,
  summaryForVisualforcePage,
} from "./summary.js";
import { buildTriggerProcessingSummary } from "./trigger-processing-summary.js";

export type RenderTargetName =
  | "system-index"
  | "system-overview"
  | "objects"
  | "flows"
  | "apex"
  | "triggers"
  | "permissions"
  | "validation-rules"
  | "approval-processes"
  | "sharing-rules"
  | "layouts"
  | "custom-metadata"
  | "named-credentials"
  | "remote-site-settings"
  | "lwc"
  | "aura"
  | "flexi-pages"
  | "visualforce-pages"
  | "visualforce-components"
  | "applications"
  | "executive-summary"
  | "all";

export interface RenderTarget {
  readonly target: RenderTargetName;
  readonly outputDir: string;
}

export interface RenderResult {
  readonly written: readonly string[];
  readonly archived: readonly string[];
  readonly warnings: readonly MergeWarning[];
}

export function renderSystemIndex(graph: KnowledgeGraph, outputDir: string): RenderResult {
  const data = {
    title: "System Index",
    builtAt: graph.meta.builtAt,
    yohakuVersion: graph.meta.yohakuVersion,
    salesforceApiVersion: graph.meta.salesforceApiVersion,
    sourceAdapter: graph.meta.sourceAdapter,
    sourceHash: graph.meta.sourceHash,
    counts: {
      objects: graph.objects.length,
      fields: graph.fields.length,
      validationRules: graph.validationRules.length,
      flows: graph.flows.length,
      apexClasses: graph.apexClasses.length,
      apexTriggers: graph.apexTriggers.length,
      permissionSets: graph.permissionSets.length,
      profiles: graph.profiles.length,
      recordTypes: graph.recordTypes.length,
      approvalProcesses: graph.approvalProcesses.length,
      sharingRules: graph.sharingRules.length,
      layouts: graph.layouts.length,
      customMetadataRecords: graph.customMetadataRecords.length,
      namedCredentials: graph.namedCredentials.length,
      remoteSiteSettings: graph.remoteSiteSettings.length,
      lwcs: graph.lwcs.length,
      auraBundles: graph.auraBundles.length,
      flexiPages: graph.flexiPages.length,
      visualforcePages: graph.visualforcePages.length,
      visualforceComponents: graph.visualforceComponents.length,
      customApplications: graph.customApplications.length,
      dependencies: graph.dependencies.length,
    },
    objectsList: graph.objects.toSorted((a, b) =>
      a.fullyQualifiedName.localeCompare(b.fullyQualifiedName),
    ),
  };

  const templated = renderEta("system-index.eta", data);
  const outPath = join(outputDir, "system-index.md");
  const existing = readIfExists(outPath);
  const merged = mergeRender(templated, existing, { templatePath: outPath });

  ensureDir(outPath);
  writeFileSync(outPath, merged.content);
  return { written: [outPath], archived: [], warnings: merged.warnings };
}

export function renderObjects(graph: KnowledgeGraph, outputDir: string): RenderResult {
  const written: string[] = [];
  const warnings: MergeWarning[] = [];

  for (const object of graph.objects) {
    const data = {
      object,
      fields: graph.fields.filter((f) => f.object === object.fullyQualifiedName),
      validationRules: graph.validationRules.filter((v) => v.object === object.fullyQualifiedName),
      dependencies: graph.dependencies.filter(
        (d) =>
          d.from.fullyQualifiedName === object.fullyQualifiedName ||
          d.to.fullyQualifiedName === object.fullyQualifiedName,
      ),
    };

    const templated = renderEta("object.eta", data);
    const outPath = join(outputDir, "objects", `${object.fullyQualifiedName}.md`);
    const existing = readIfExists(outPath);
    const merged = mergeRender(templated, existing, { templatePath: outPath });

    ensureDir(outPath);
    writeFileSync(outPath, merged.content);
    written.push(outPath);
    warnings.push(...merged.warnings);
  }

  const archived = archiveOrphans(graph.objects, outputDir);
  return { written, archived, warnings };
}

interface SimpleEntity {
  readonly fullyQualifiedName: string;
}

function renderEntities<T extends SimpleEntity>(
  entities: readonly T[],
  outputDir: string,
  subDir: string,
  templateFile: string,
  buildData: (entity: T) => Record<string, unknown>,
): RenderResult {
  const written: string[] = [];
  const warnings: MergeWarning[] = [];

  for (const entity of entities) {
    const data = buildData(entity);
    const templated = renderEta(templateFile, data);
    const outPath = join(outputDir, subDir, `${entity.fullyQualifiedName}.md`);
    const existing = readIfExists(outPath);
    const merged = mergeRender(templated, existing, { templatePath: outPath });
    ensureDir(outPath);
    writeFileSync(outPath, merged.content);
    written.push(outPath);
    warnings.push(...merged.warnings);
  }

  const archived = archiveOrphansBySubDir(entities, outputDir, subDir);
  return { written, archived, warnings };
}

function depsForEntity(graph: KnowledgeGraph, fqn: string) {
  return graph.dependencies.filter(
    (d) => d.from.fullyQualifiedName === fqn || d.to.fullyQualifiedName === fqn,
  );
}

export function renderFlows(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(graph.flows, outputDir, "flows", "flow.eta", (flow) => {
    const chart = flow.body !== undefined ? buildFlowFlowchart(flow.body) : undefined;
    return {
      flow,
      dependencies: depsForEntity(graph, flow.fullyQualifiedName),
      concerns: concernsForFlow(flow),
      flowchart: chart !== undefined ? ensureTrailingNewline(chart.mermaid) : undefined,
      flowchartDetails: (chart?.details ?? []).map((d) => ({
        ...d,
        fullText: escapeForTableCell(d.fullText),
      })),
      flowSequenceRows: buildFlowSequenceTable(flow),
      quickSummary: summaryForFlow(flow),
    };
  });
}

export function renderApex(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(graph.apexClasses, outputDir, "apex", "apex-class.eta", (cls) => {
    const methodSummaryRows = buildMethodSummaryTable(cls);
    return {
      cls,
      dependencies: depsForEntity(graph, cls.fullyQualifiedName),
      concerns: concernsForApex(cls, graph),
      methodSummaryRows,
      intraClassCallGraph: ensureTrailingNewline(buildIntraClassCallGraph(methodSummaryRows)),
      methodFlowcharts: (cls.body?.controlFlows ?? []).map((f) => {
        const chart = buildMethodFlowchart(f);
        return {
          methodName: f.methodName,
          signature: f.signature,
          mermaid: ensureTrailingNewline(chart.mermaid),
          details: chart.details.map((d) => ({
            ...d,
            fullText: escapeForTableCell(d.fullText),
          })),
        };
      }),
      quickSummary: summaryForApex(cls, graph),
    };
  });
}

export function renderApexTriggers(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(graph.apexTriggers, outputDir, "triggers", "apex-trigger.eta", (trg) => ({
    trg,
    dependencies: depsForEntity(graph, trg.fullyQualifiedName),
    flowDiagram: ensureTrailingNewline(buildTriggerMermaid(trg, graph)),
    concerns: concernsForTrigger(trg, graph),
    triggerProcessingSummary: buildTriggerProcessingSummary(trg),
    quickSummary: summaryForApexTrigger(trg, graph),
  }));
}

export function renderSystemOverview(graph: KnowledgeGraph, outputDir: string): RenderResult {
  const data = {
    title: "System Overview",
    builtAt: graph.meta.builtAt,
    diagram: ensureTrailingNewline(buildSystemOverviewMermaid(graph)),
    erDiagram: ensureTrailingNewline(buildErDiagram(graph)),
    triggerCount: graph.apexTriggers.length,
    flowCount: graph.flows.length,
    apexCount: graph.apexClasses.length,
    objectCount: graph.objects.length,
  };
  const templated = renderEta("system-overview.eta", data);
  const outPath = join(outputDir, "system-overview.md");
  const existing = readIfExists(outPath);
  const merged = mergeRender(templated, existing, { templatePath: outPath });
  ensureDir(outPath);
  writeFileSync(outPath, merged.content);
  return { written: [outPath], archived: [], warnings: merged.warnings };
}

export function renderPermissions(graph: KnowledgeGraph, outputDir: string): RenderResult {
  // PermissionSet と Profile は別サブディレクトリ (同一だと archiveOrphans が他方を orphan と誤判定する)
  const psResult = renderEntities(
    graph.permissionSets,
    outputDir,
    "permissions/permission-sets",
    "permission-set.eta",
    (ps) => ({ ps, quickSummary: summaryForPermissionSet(ps) }),
  );
  const pfResult = renderEntities(
    graph.profiles,
    outputDir,
    "permissions/profiles",
    "profile.eta",
    (pf) => ({ pf, quickSummary: summaryForProfile(pf) }),
  );
  return {
    written: [...psResult.written, ...pfResult.written],
    archived: [...psResult.archived, ...pfResult.archived],
    warnings: [...psResult.warnings, ...pfResult.warnings],
  };
}

export function renderValidationRules(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(
    graph.validationRules,
    outputDir,
    "validation-rules",
    "validation-rule.eta",
    (vr) => ({
      vr,
      quickSummary: summaryForValidationRule(vr),
      formulaNatural:
        vr.errorConditionFormula !== undefined
          ? formulaToNaturalLanguage(vr.errorConditionFormula)
          : undefined,
    }),
  );
}

export function renderRecordTypes(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(graph.recordTypes, outputDir, "record-types", "record-type.eta", (rt) => ({
    rt,
    quickSummary: summaryForRecordType(rt),
  }));
}

export function renderApprovalProcesses(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(
    graph.approvalProcesses,
    outputDir,
    "approval-processes",
    "approval-process.eta",
    (ap) => ({
      ap,
      quickSummary: summaryForApprovalProcess(ap),
      mermaid: ensureTrailingNewline(buildApprovalMermaid(ap)),
      ifNotMetLabel: ifNotMetLabel,
    }),
  );
}

export function renderLayouts(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(graph.layouts, outputDir, "layouts", "layout.eta", (layout) => ({
    layout,
    quickSummary: summaryForLayout(layout),
  }));
}

export function renderCustomMetadataRecords(
  graph: KnowledgeGraph,
  outputDir: string,
): RenderResult {
  return renderEntities(
    graph.customMetadataRecords,
    outputDir,
    "custom-metadata",
    "custom-metadata-record.eta",
    (cmr) => ({ cmr, quickSummary: summaryForCustomMetadataRecord(cmr) }),
  );
}

export function renderNamedCredentials(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(
    graph.namedCredentials,
    outputDir,
    "named-credentials",
    "named-credential.eta",
    (nc) => ({ nc, quickSummary: summaryForNamedCredential(nc) }),
  );
}

export function renderRemoteSiteSettings(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(
    graph.remoteSiteSettings,
    outputDir,
    "remote-site-settings",
    "remote-site-setting.eta",
    (rss) => ({ rss, quickSummary: summaryForRemoteSiteSetting(rss) }),
  );
}

export function renderLwcs(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(graph.lwcs, outputDir, "lwc", "lwc.eta", (lwc) => ({
    lwc,
    quickSummary: summaryForLwc(lwc),
  }));
}

export function renderAuraBundles(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(graph.auraBundles, outputDir, "aura", "aura-bundle.eta", (aura) => ({
    aura,
    quickSummary: summaryForAuraBundle(aura),
  }));
}

export function renderFlexiPages(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(graph.flexiPages, outputDir, "flexi-pages", "flexi-page.eta", (fp) => ({
    fp,
    quickSummary: summaryForFlexiPage(fp),
  }));
}

export function renderVisualforcePages(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(
    graph.visualforcePages,
    outputDir,
    "visualforce-pages",
    "visualforce-page.eta",
    (vfp) => ({ vfp, quickSummary: summaryForVisualforcePage(vfp) }),
  );
}

export function renderVisualforceComponents(
  graph: KnowledgeGraph,
  outputDir: string,
): RenderResult {
  return renderEntities(
    graph.visualforceComponents,
    outputDir,
    "visualforce-components",
    "visualforce-component.eta",
    (vfc) => ({ vfc, quickSummary: summaryForVisualforceComponent(vfc) }),
  );
}

export function renderCustomApplications(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(
    graph.customApplications,
    outputDir,
    "applications",
    "custom-application.eta",
    (app) => ({ app, quickSummary: summaryForCustomApplication(app) }),
  );
}

export function renderSharingRules(graph: KnowledgeGraph, outputDir: string): RenderResult {
  return renderEntities(
    graph.sharingRules,
    outputDir,
    "sharing-rules",
    "sharing-rule.eta",
    (sr) => ({
      sr,
      quickSummary: summaryForSharingRule(sr),
      conditionsNatural: criteriaItemsToNatural(sr.criteriaItems, sr.criteriaBooleanFilter),
    }),
  );
}

function ifNotMetLabel(value: string): string {
  switch (value) {
    case "ApproveRecord":
      return "条件不一致でも承認";
    case "RejectRequest":
      return "条件不一致なら却下";
    case "GoToNextStep":
      return "条件不一致なら次の Step へ";
    default:
      return "未指定";
  }
}

function criteriaItemsToNatural(
  items: readonly { field: string; operation: string; value: string }[],
  booleanFilter: string | undefined,
): string {
  if (items.length === 0) return "(条件なし)";
  const phrase = (field: string, op: string, value: string): string => {
    const f = `\`${field}\``;
    const v = `\`${value}\``;
    switch (op) {
      case "equals":
        return `${f} が ${v} に等しい`;
      case "notEqual":
        return `${f} が ${v} と異なる`;
      case "lessThan":
        return `${f} が ${v} 未満`;
      case "greaterThan":
        return `${f} が ${v} より大きい`;
      case "lessOrEqual":
        return `${f} が ${v} 以下`;
      case "greaterOrEqual":
        return `${f} が ${v} 以上`;
      case "contains":
        return `${f} が ${v} を含む`;
      case "notContain":
        return `${f} が ${v} を含まない`;
      case "startsWith":
        return `${f} が ${v} で始まる`;
      case "includes":
        return `${f} に ${v} が含まれる (Picklist)`;
      case "excludes":
        return `${f} に ${v} が含まれない (Picklist)`;
      default:
        return `${f} ${op} ${v}`;
    }
  };
  const lines = items.map((c, i) => `${i + 1}. ${phrase(c.field, c.operation, c.value)}`);
  const head =
    booleanFilter !== undefined && booleanFilter.trim() !== ""
      ? `Boolean filter: \`${booleanFilter}\``
      : items.length > 1
        ? "以下を **全て** 満たすレコード:"
        : "次の条件を満たすレコード:";
  return `${head}\n${lines.join("\n")}`;
}

export function renderAll(graph: KnowledgeGraph, outputDir: string): RenderResult {
  const results = [
    renderSystemIndex(graph, outputDir),
    renderSystemOverview(graph, outputDir),
    renderObjects(graph, outputDir),
    renderFlows(graph, outputDir),
    renderApex(graph, outputDir),
    renderApexTriggers(graph, outputDir),
    renderPermissions(graph, outputDir),
    renderValidationRules(graph, outputDir),
    renderRecordTypes(graph, outputDir),
    renderApprovalProcesses(graph, outputDir),
    renderSharingRules(graph, outputDir),
    renderLayouts(graph, outputDir),
    renderCustomMetadataRecords(graph, outputDir),
    renderNamedCredentials(graph, outputDir),
    renderRemoteSiteSettings(graph, outputDir),
    renderLwcs(graph, outputDir),
    renderAuraBundles(graph, outputDir),
    renderFlexiPages(graph, outputDir),
    renderVisualforcePages(graph, outputDir),
    renderVisualforceComponents(graph, outputDir),
    renderCustomApplications(graph, outputDir),
    renderExecutiveSummary(graph, outputDir),
    renderExecutiveRisks(graph, outputDir),
  ];
  return {
    written: results.flatMap((r) => r.written),
    archived: results.flatMap((r) => r.archived),
    warnings: results.flatMap((r) => r.warnings),
  };
}

export function renderExecutiveSummary(graph: KnowledgeGraph, outputDir: string): RenderResult {
  const data = {
    builtAt: graph.meta.builtAt,
    yohakuVersion: graph.meta.yohakuVersion,
    salesforceApiVersion: graph.meta.salesforceApiVersion,
    counts: {
      objects: graph.objects.length,
      fields: graph.fields.length,
      validationRules: graph.validationRules.length,
      flows: graph.flows.length,
      apexClasses: graph.apexClasses.length,
      apexTriggers: graph.apexTriggers.length,
      permissionSets: graph.permissionSets.length,
      profiles: graph.profiles.length,
    },
    customObjects: graph.objects.filter((o) => o.isCustom).map((o) => o.fullyQualifiedName),
    triggersByObject: groupTriggersByObject(graph),
    apexTestRatio: computeTestRatio(graph),
  };
  const templated = renderEta("executive-summary.eta", data);
  const outPath = join(outputDir, "executive", "summary.md");
  const existing = readIfExists(outPath);
  const merged = mergeRender(templated, existing, { templatePath: outPath });
  ensureDir(outPath);
  writeFileSync(outPath, merged.content);
  return { written: [outPath], archived: [], warnings: merged.warnings };
}

export function renderExecutiveRisks(graph: KnowledgeGraph, outputDir: string): RenderResult {
  const apexFindings = graph.apexClasses.flatMap((c) =>
    concernsForApex(c, graph).map((concern) => ({
      kind: "ApexClass",
      target: c.fullyQualifiedName,
      ...concern,
    })),
  );
  const triggerFindings = graph.apexTriggers.flatMap((t) =>
    concernsForTrigger(t, graph).map((concern) => ({
      kind: "ApexTrigger",
      target: t.fullyQualifiedName,
      ...concern,
    })),
  );
  const flowFindings = graph.flows.flatMap((f) =>
    concernsForFlow(f).map((concern) => ({
      kind: "Flow",
      target: f.fullyQualifiedName,
      ...concern,
    })),
  );
  const all = [...apexFindings, ...triggerFindings, ...flowFindings];
  const high = all.filter((f) => f.severity === "HIGH");
  const medium = all.filter((f) => f.severity === "MEDIUM");
  const info = all.filter((f) => f.severity === "INFO");

  const data = {
    builtAt: graph.meta.builtAt,
    counts: { high: high.length, medium: medium.length, info: info.length, total: all.length },
    findings: { high, medium, info },
  };
  const templated = renderEta("executive-risks.eta", data);
  const outPath = join(outputDir, "executive", "risks.md");
  const existing = readIfExists(outPath);
  const merged = mergeRender(templated, existing, { templatePath: outPath });
  ensureDir(outPath);
  writeFileSync(outPath, merged.content);
  return { written: [outPath], archived: [], warnings: merged.warnings };
}

function groupTriggersByObject(
  graph: KnowledgeGraph,
): readonly { object: string; triggers: readonly string[] }[] {
  const map = new Map<string, string[]>();
  for (const t of graph.apexTriggers) {
    const list = map.get(t.object) ?? [];
    list.push(t.fullyQualifiedName);
    map.set(t.object, list);
  }
  return [...map.entries()]
    .map(([object, triggers]) => ({
      object,
      triggers: triggers.toSorted((a, b) => a.localeCompare(b)),
    }))
    .toSorted((a, b) => a.object.localeCompare(b.object));
}

function computeTestRatio(graph: KnowledgeGraph): {
  tests: number;
  nonTests: number;
  ratio: number;
} {
  const tests = graph.apexClasses.filter((c) => c.isTest).length;
  const nonTests = graph.apexClasses.length - tests;
  const ratio = nonTests === 0 ? 0 : Math.round((tests / nonTests) * 100) / 100;
  return { tests, nonTests, ratio };
}

function archiveOrphansBySubDir<T extends SimpleEntity>(
  current: readonly T[],
  outputDir: string,
  subDir: string,
): readonly string[] {
  const dir = join(outputDir, subDir);
  if (!existsSync(dir)) return [];
  const validNames = new Set(current.map((e) => `${e.fullyQualifiedName}.md`));
  const archived: string[] = [];
  const renderDate = new Date().toISOString().slice(0, 10);
  const archiveBase = join(outputDir, "_archive");
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    if (validNames.has(entry)) continue;
    const from = join(dir, entry);
    const archivedRel = archiveDeleted(`${outputDir}/${subDir}/${entry}`, archiveBase, renderDate);
    ensureDir(archivedRel);
    renameSync(from, archivedRel);
    archived.push(archivedRel);
  }
  return archived;
}

function archiveOrphans(currentObjects: readonly SObject[], outputDir: string): readonly string[] {
  const objectsDir = join(outputDir, "objects");
  if (!existsSync(objectsDir)) return [];

  const validNames = new Set(currentObjects.map((o) => `${o.fullyQualifiedName}.md`));
  const archived: string[] = [];
  const renderDate = new Date().toISOString().slice(0, 10);
  const archiveBase = join(outputDir, "_archive");

  const entries = readdirSync(objectsDir);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    if (validNames.has(entry)) continue;
    const from = join(objectsDir, entry);
    const archivedRel = archiveDeleted(`${outputDir}/objects/${entry}`, archiveBase, renderDate);
    ensureDir(archivedRel);
    renameSync(from, archivedRel);
    archived.push(archivedRel);
  }
  return archived;
}

function readIfExists(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return readFileSync(path, "utf8");
}

/**
 * Markdown 表セル + バッククォート (`...`) で囲んで使うテキストを安全な形にする。
 * - パイプ `|` をエスケープ (table 区切り)
 * - バッククォートを HTML エンティティに置換 (Markdown の inline code を壊さない)
 */
function escapeForTableCell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/`/g, "&#96;");
}

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

/**
 * eta の autoTrim=[false, "nl"] が `%>` 直後の改行を 1 つ落とす設計のため、
 * Mermaid などの multi-line 値が改行で終わっていないと、後続の閉じフェンス (` ``` `) が
 * 値の最終行に貼りついてしまう。値側で常に改行終端を保証してこの境界を維持する。
 */
function ensureTrailingNewline(value: string): string {
  if (value === "") return value;
  return value.endsWith("\n") ? value : `${value}\n`;
}
