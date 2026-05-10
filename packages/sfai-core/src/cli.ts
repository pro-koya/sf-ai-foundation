#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DxMcpSourceAdapter } from "./adapters/dx-mcp/index.js";
import { LocalSourceAdapter } from "./adapters/local/index.js";
import { computeDiff } from "./diff/index.js";
import { EXPLAIN_KINDS, type ExplainKind, applyExplain } from "./explain/index.js";
import { KnowledgeGraphReader, SqliteGraphStore, buildGraph } from "./graph/index.js";
import { type PrimaryLanguage, type Profile, type Segment, runInit } from "./init/index.js";
import { MetricsStore, summarize } from "./metrics/index.js";
import {
  OnboardingStateStore,
  PERSONA_IDS,
  type PersonaId,
  expandReadOrder,
  extractFaq,
  loadContextMap,
  renderFaqMarkdown,
} from "./onboarding/index.js";
import {
  renderAll,
  renderApex,
  renderApexTriggers,
  renderFlows,
  renderObjects,
  renderPermissions,
  renderSystemIndex,
  renderValidationRules,
} from "./render/index.js";
import { parseSarifFile } from "./sarif/index.js";
import { loadGraphSchema, validateGraph } from "./schema/validate.js";
import { PathGuardError, assertWithinRoot, resolveWithinRoot } from "./util/path-guard.js";

const here = dirname(fileURLToPath(import.meta.url));
const BUNDLED_SCAFFOLD = resolve(here, "scaffold");

const SFAI_VERSION = "0.0.1";
const DEFAULT_API = "62.0";
const DEFAULT_DB = ".sfai/graph.sqlite";
const DEFAULT_OUT = "docs/generated";

interface ParsedArgs {
  readonly command: readonly string[];
  readonly flags: ReadonlyMap<string, string>;
  readonly positional: readonly string[];
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const command: string[] = [];
  const flags = new Map<string, string>();
  const positional: string[] = [];
  let inFlags = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg.startsWith("--")) {
      inFlags = true;
      const eqIdx = arg.indexOf("=");
      if (eqIdx > 0) {
        flags.set(arg.slice(2, eqIdx), arg.slice(eqIdx + 1));
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          flags.set(arg.slice(2), next);
          i++;
        } else {
          flags.set(arg.slice(2), "true");
        }
      }
    } else if (inFlags) {
      positional.push(arg);
    } else {
      command.push(arg);
    }
  }
  return { command, flags, positional };
}

interface BuildAndStoreOptions {
  readonly root: string;
  readonly dbPath: string;
  readonly apiVersion: string;
  readonly incremental: boolean;
  readonly quiet: boolean;
  readonly sourceKind?: "local" | "dx-mcp";
}

async function buildAndStore(options: BuildAndStoreOptions): Promise<{
  readonly objects: number;
  readonly fields: number;
  readonly flows: number;
  readonly apex: number;
}> {
  const adapter =
    options.sourceKind === "dx-mcp"
      ? new DxMcpSourceAdapter({ apiVersion: options.apiVersion })
      : new LocalSourceAdapter({ rootPath: options.root });
  const graph = await buildGraph(adapter, {
    sfaiVersion: SFAI_VERSION,
    salesforceApiVersion: options.apiVersion,
    projectRoot: options.root,
  });

  const store = new SqliteGraphStore({ dbPath: options.dbPath });
  store.writeAll(graph, options.incremental ? "incremental" : "full");
  store.close();

  const counts = {
    objects: graph.objects.length,
    fields: graph.fields.length,
    flows: graph.flows.length,
    apex: graph.apexClasses.length,
  };
  if (!options.quiet) {
    console.log(
      `[sfai] graph build complete: objects=${counts.objects} fields=${counts.fields} flows=${counts.flows} apex=${counts.apex}`,
    );
  }
  return counts;
}

async function cmdGraphBuild(args: ParsedArgs): Promise<number> {
  const root = args.flags.get("root") ?? process.cwd();
  const dbPath = resolve(root, args.flags.get("db") ?? DEFAULT_DB);
  const sourceKind = (args.flags.get("source") ?? "local") as "local" | "dx-mcp";
  const incremental = args.flags.get("incremental") === "true";
  const apiVersion = args.flags.get("api") ?? DEFAULT_API;
  const quiet = args.flags.get("quiet") === "true";

  if (sourceKind !== "local" && sourceKind !== "dx-mcp") {
    console.error(`Unknown source: ${sourceKind}. Use --source local|dx-mcp.`);
    return 2;
  }

  await buildAndStore({ root, dbPath, apiVersion, incremental, quiet, sourceKind });
  return 0;
}

async function cmdSync(args: ParsedArgs): Promise<number> {
  const root = args.flags.get("root") ?? process.cwd();
  const dbPath = resolve(root, args.flags.get("db") ?? DEFAULT_DB);
  const outDir = resolve(root, args.flags.get("output") ?? DEFAULT_OUT);
  const apiVersion = args.flags.get("api") ?? DEFAULT_API;
  const quiet = args.flags.get("quiet") === "true";
  // sync はデフォルトで incremental (full は --full-rebuild で明示)
  const incremental = args.flags.get("full-rebuild") !== "true";

  await buildAndStore({ root, dbPath, apiVersion, incremental, quiet });

  const graph = readGraphFromStore(dbPath);
  // Phase 7-A: sync で全種 Markdown 化
  reportRender(renderAll(graph, outDir));
  return 0;
}

async function cmdGraphQuery(args: ParsedArgs): Promise<number> {
  const root = args.flags.get("root") ?? process.cwd();
  const dbPath = resolve(root, args.flags.get("db") ?? DEFAULT_DB);
  // SQL は "graph query" の後ろ (command[2]+) と positional のどちらにも来うる
  const sqlFromCommand = args.command.slice(2).join(" ");
  const sqlFromPositional = args.positional.join(" ");
  const sql = [sqlFromCommand, sqlFromPositional]
    .filter((s) => s !== "")
    .join(" ")
    .trim();
  if (sql === "") {
    console.error('Usage: sfai graph query "<SQL>"');
    return 2;
  }
  // 外部入力 SQL は readonly モード + SELECT allowlist の二重防御で実行する
  const store = new SqliteGraphStore({ dbPath, readonly: true });
  let rows: readonly unknown[];
  try {
    rows = store.queryUntrusted(sql);
  } catch (err) {
    console.error(`[sfai] graph query rejected: ${(err as Error).message}`);
    store.close();
    return 2;
  }
  store.close();
  console.log(JSON.stringify(rows, null, 2));
  return 0;
}

async function cmdGraphSchema(args: ParsedArgs): Promise<number> {
  const format = args.flags.get("format") ?? "json";
  const schema = loadGraphSchema();
  if (format === "markdown") {
    console.log("# Knowledge Graph Schema\n");
    console.log("```json");
    console.log(JSON.stringify(schema, null, 2));
    console.log("```");
  } else {
    console.log(JSON.stringify(schema, null, 2));
  }
  return 0;
}

async function cmdRender(args: ParsedArgs): Promise<number> {
  const target = args.command[1];
  const root = args.flags.get("root") ?? process.cwd();
  const outDir = resolve(root, args.flags.get("output") ?? DEFAULT_OUT);
  const dbPath = resolve(root, args.flags.get("db") ?? DEFAULT_DB);
  const renderAllFlag = args.flags.get("all") === "true";

  if (!existsSync(dbPath)) {
    console.error(`Knowledge graph not found at ${dbPath}. Run "sfai graph build" first.`);
    return 2;
  }

  const graph = readGraphFromStore(dbPath);

  if (target === undefined && renderAllFlag) {
    reportRender(renderAll(graph, outDir));
    return 0;
  }
  if (target === undefined) {
    // 後方互換: 引数省略時は system-index + objects (Phase 2.5 仕様)
    const r1 = renderSystemIndex(graph, outDir);
    const r2 = renderObjects(graph, outDir);
    reportRender({
      written: [...r1.written, ...r2.written],
      archived: [...r1.archived, ...r2.archived],
      warnings: [...r1.warnings, ...r2.warnings],
    });
    return 0;
  }
  if (target === "all") {
    reportRender(renderAll(graph, outDir));
    return 0;
  }
  if (target === "system-index") {
    reportRender(renderSystemIndex(graph, outDir));
    return 0;
  }
  if (target === "objects") {
    reportRender(renderObjects(graph, outDir));
    return 0;
  }
  if (target === "flows") {
    reportRender(renderFlows(graph, outDir));
    return 0;
  }
  if (target === "apex") {
    reportRender(renderApex(graph, outDir));
    return 0;
  }
  if (target === "triggers") {
    reportRender(renderApexTriggers(graph, outDir));
    return 0;
  }
  if (target === "permissions") {
    reportRender(renderPermissions(graph, outDir));
    return 0;
  }
  if (target === "validation-rules") {
    reportRender(renderValidationRules(graph, outDir));
    return 0;
  }
  console.error(`Unknown render target: ${target}`);
  return 2;
}

function reportRender(result: {
  written: readonly string[];
  archived: readonly string[];
  warnings: readonly { code: string; blockId?: string }[];
}): void {
  console.log(
    `[sfai] render complete: written=${result.written.length} archived=${result.archived.length} warnings=${result.warnings.length}`,
  );
  for (const w of result.warnings) {
    console.warn(`  warning: ${w.code} ${w.blockId ?? ""}`);
  }
}

function readGraphFromStore(dbPath: string) {
  const reader = new KnowledgeGraphReader({ dbPath });
  try {
    return reader.read();
  } finally {
    reader.close();
  }
}

async function cmdDiff(args: ParsedArgs): Promise<number> {
  const root = args.flags.get("root") ?? process.cwd();
  const fromRef = args.flags.get("from");
  const toRef = args.flags.get("to") ?? "HEAD";
  if (fromRef === undefined) {
    console.error("Usage: sfai diff --from <ref> [--to <ref>] [--path-prefix force-app/]");
    return 2;
  }
  const fileLimitRaw = args.flags.get("limit");
  const fileLimit =
    fileLimitRaw !== undefined && !Number.isNaN(Number(fileLimitRaw))
      ? Number(fileLimitRaw)
      : undefined;
  const pathPrefix = args.flags.get("path-prefix");

  const diff = computeDiff({
    fromRef,
    toRef,
    cwd: root,
    ...(fileLimit !== undefined ? { fileLimit } : {}),
    ...(pathPrefix !== undefined ? { pathPrefix } : {}),
  });

  const sarifPath = args.flags.get("include-static-analysis");
  const findings = sarifPath !== undefined ? parseSarifFile(resolve(root, sarifPath)) : [];

  const json = args.flags.get("json") === "true";
  if (json) {
    console.log(JSON.stringify({ ...diff, staticAnalysisFindings: findings }, null, 2));
  } else {
    console.log(
      `[sfai] diff ${fromRef}..${toRef}: files=${diff.totals.files} +${diff.totals.addedLines} -${diff.totals.removedLines} truncated=${diff.truncated}`,
    );
    for (const [cat, count] of Object.entries(diff.totals.byCategory)) {
      if (count === 0) continue;
      console.log(`  ${cat}: ${count}`);
    }
    if (findings.length > 0) {
      console.log(`  static_analysis: ${findings.length} findings`);
    }
  }
  return 0;
}

async function cmdOnboardContext(args: ParsedArgs): Promise<number> {
  const root = args.flags.get("root") ?? process.cwd();
  const role = (args.flags.get("role") ?? "new_joiner").replace(/-/g, "_") as PersonaId;
  if (!PERSONA_IDS.includes(role)) {
    console.error(`Unknown role: ${role}. Use one of: ${PERSONA_IDS.join(", ")}`);
    return 2;
  }
  const contextMap = loadContextMap({ rootPath: root });
  const persona = contextMap.personas[role];
  const expanded = expandReadOrder(persona, contextMap);
  const output = {
    project: contextMap.project.name,
    role,
    goal: persona.goal,
    depth: persona.depth,
    primaryAgent: persona.primaryAgent,
    readOrder: expanded,
    domains: contextMap.project.domains,
  };
  console.log(JSON.stringify(output, null, 2));
  return 0;
}

async function cmdOnboardState(args: ParsedArgs): Promise<number> {
  const root = args.flags.get("root") ?? process.cwd();
  const sub = args.command[2] ?? "show";
  const store = new OnboardingStateStore({ rootPath: root });

  if (sub === "show") {
    console.log(JSON.stringify(store.read(), null, 2));
    return 0;
  }
  if (sub === "record-step") {
    const role = (args.flags.get("role") ?? "").replace(/-/g, "_") as PersonaId;
    const step = args.flags.get("step");
    if (!PERSONA_IDS.includes(role) || step === undefined) {
      console.error(
        "Usage: sfai onboard state record-step --role <persona> --step <step-id> [--entities a,b,c]",
      );
      return 2;
    }
    const entitiesRaw = args.flags.get("entities");
    const entities = entitiesRaw ? entitiesRaw.split(",").map((s) => s.trim()) : [];
    const result = store.recordStep(role, step, entities);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  if (sub === "increment-questions") {
    const role = (args.flags.get("role") ?? "").replace(/-/g, "_") as PersonaId;
    if (!PERSONA_IDS.includes(role)) {
      console.error("Usage: sfai onboard state increment-questions --role <persona>");
      return 2;
    }
    const result = store.incrementQuestions(role);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }
  if (sub === "reset") {
    const roleFlag = args.flags.get("role");
    const role = roleFlag !== undefined ? (roleFlag.replace(/-/g, "_") as PersonaId) : undefined;
    if (role !== undefined && !PERSONA_IDS.includes(role)) {
      console.error(`Unknown role: ${role}`);
      return 2;
    }
    store.reset(role);
    console.log(`[sfai] reset ${role ?? "all"}`);
    return 0;
  }
  console.error(`Unknown subcommand: state ${sub}. Use show|record-step|increment-questions|reset`);
  return 2;
}

async function cmdOnboardFaqExtract(args: ParsedArgs): Promise<number> {
  const root = args.flags.get("root") ?? process.cwd();
  const inputFile = args.flags.get("input");
  const topic = args.flags.get("topic") ?? "general";
  const minOcc = Number(args.flags.get("min-occurrences") ?? 1);
  if (inputFile === undefined) {
    console.error(
      "Usage: sfai onboard faq extract --input <dialog-log.md> [--topic <name>] [--min-occurrences 1]",
    );
    return 2;
  }
  let inputAbs: string;
  try {
    inputAbs = resolveWithinRoot(root, inputFile, "--input");
  } catch (err) {
    console.error(`[sfai] ${(err as Error).message}`);
    return 2;
  }
  const content = readFileSync(inputAbs, "utf8");
  const candidates = extractFaq(content, { minOccurrences: Number.isNaN(minOcc) ? 1 : minOcc });
  const md = renderFaqMarkdown(topic, candidates);
  console.log(md);
  return 0;
}

async function cmdValidate(args: ParsedArgs): Promise<number> {
  const targetPath = args.flags.get("target");
  if (targetPath === undefined) {
    console.error("Usage: sfai validate --target <path-to-json-graph>");
    return 2;
  }
  let resolvedTarget: string;
  try {
    resolvedTarget = resolveWithinRoot(process.cwd(), targetPath, "--target");
  } catch (err) {
    console.error(`[sfai] ${(err as Error).message}`);
    return 2;
  }
  let raw: string;
  try {
    raw = readFileSync(resolvedTarget, "utf8");
  } catch (err) {
    console.error(`[sfai] cannot read --target: ${(err as Error).message}`);
    return 1;
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`[sfai] --target is not valid JSON: ${(err as Error).message}`);
    return 1;
  }
  try {
    validateGraph(data);
    console.log("[sfai] validate: OK");
    return 0;
  } catch (err) {
    console.error(`[sfai] validate: FAILED — ${(err as Error).message}`);
    return 1;
  }
}

async function cmdVersion(): Promise<number> {
  console.log(SFAI_VERSION);
  return 0;
}

async function cmdMetricsShow(args: ParsedArgs): Promise<number> {
  const root = args.flags.get("root") ?? process.cwd();
  const period = (args.flags.get("period") ?? "month") as "day" | "week" | "month" | "all";
  const store = new MetricsStore({ rootPath: root });
  const summary = summarize(store.read(), period);
  const output = {
    period: summary.period,
    since: summary.since,
    totals: summary.totals,
    byModel: Object.fromEntries(summary.byModel),
    byCommand: Object.fromEntries(summary.byCommand),
  };
  console.log(JSON.stringify(output, null, 2));
  return 0;
}

async function cmdMetricsRecord(args: ParsedArgs): Promise<number> {
  const root = args.flags.get("root") ?? process.cwd();
  const model = args.flags.get("model");
  const command = args.flags.get("command");
  const tokensIn = Number(args.flags.get("in") ?? 0);
  const tokensOut = Number(args.flags.get("out") ?? 0);
  const note = args.flags.get("note");

  if (
    model === undefined ||
    command === undefined ||
    Number.isNaN(tokensIn) ||
    Number.isNaN(tokensOut)
  ) {
    console.error(
      'Usage: sfai metrics record --model <id> --command <name> --in <tokens> --out <tokens> [--note "<text>"]',
    );
    return 2;
  }

  const store = new MetricsStore({ rootPath: root });
  const event = store.record({
    model,
    command,
    tokensIn,
    tokensOut,
    ...(note !== undefined ? { note } : {}),
  });
  console.log(JSON.stringify(event, null, 2));
  return 0;
}

async function cmdInit(args: ParsedArgs): Promise<number> {
  const targetDir = args.flags.get("target") ?? args.flags.get("root") ?? process.cwd();
  const profile = (args.flags.get("profile") ?? "standard") as Profile;
  const projectName =
    args.flags.get("project-name") ?? args.flags.get("name") ?? defaultProjectName(targetDir);
  const language = (args.flags.get("language") ?? "ja") as PrimaryLanguage;
  const apiVersion = args.flags.get("api") ?? DEFAULT_API;
  const segment = (args.flags.get("segment") ?? "unspecified") as Segment;
  const repoUrl = args.flags.get("repo") ?? "";
  const conflict = (args.flags.get("conflict") ?? "skip") as "skip" | "overwrite" | "rename";
  const scaffoldDir = args.flags.get("scaffold") ?? BUNDLED_SCAFFOLD;

  if (!existsSync(scaffoldDir)) {
    console.error(`[sfai] init: scaffold directory not found at ${scaffoldDir}`);
    return 1;
  }

  const result = await runInit({
    targetDir: resolve(targetDir),
    scaffoldDir,
    conflict,
    variables: {
      projectName,
      profile,
      primaryLanguage: language,
      salesforceApiVersion: apiVersion,
      sfaiVersion: SFAI_VERSION,
      segment,
      repoUrl,
      now: new Date().toISOString(),
      enabledCommands: [],
      enabledAgents: [],
      includeDxMcpAdapter: false,
      includeStaticAnalysis: false,
    },
  });

  console.log(
    `[sfai] init complete: written=${result.written.length} skipped=${result.skipped.length} renamed=${result.renamed.length}`,
  );
  if (args.flags.get("verbose") === "true") {
    console.log(JSON.stringify(result, null, 2));
  }

  if (args.flags.get("bootstrap") === "true") {
    const root = resolve(targetDir);
    const dbPath = resolve(root, DEFAULT_DB);
    const outDir = resolve(root, DEFAULT_OUT);
    console.log("[sfai] bootstrap: graph build ...");
    await buildAndStore({ root, dbPath, apiVersion, incremental: false, quiet: false });
    console.log("[sfai] bootstrap: render (all) ...");
    const graph = readGraphFromStore(dbPath);
    reportRender(renderAll(graph, outDir));
    console.log("[sfai] bootstrap: complete. Open Claude Code and try /onboard.");
  }
  return 0;
}

function defaultProjectName(targetDir: string): string {
  const segments = resolve(targetDir).split("/");
  return segments.at(-1) ?? "salesforce-project";
}

interface CommandHandler {
  readonly handler: (args: ParsedArgs) => Promise<number>;
}

const COMMANDS: ReadonlyMap<string, CommandHandler> = new Map([
  ["init", { handler: cmdInit }],
  ["sync", { handler: cmdSync }],
  ["graph build", { handler: cmdGraphBuild }],
  ["graph query", { handler: cmdGraphQuery }],
  ["graph schema", { handler: cmdGraphSchema }],
  ["render", { handler: cmdRender }],
  ["diff", { handler: cmdDiff }],
  ["validate", { handler: cmdValidate }],
  ["metrics show", { handler: cmdMetricsShow }],
  ["metrics record", { handler: cmdMetricsRecord }],
  ["metrics", { handler: cmdMetricsShow }],
  ["onboard context", { handler: cmdOnboardContext }],
  ["onboard state", { handler: cmdOnboardState }],
  ["onboard faq", { handler: cmdOnboardFaqExtract }],
  ["explain-write", { handler: cmdExplainWrite }],
  ["version", { handler: cmdVersion }],
]);

async function cmdExplainWrite(args: ParsedArgs): Promise<number> {
  const kindRaw = args.flags.get("kind");
  const fqn = args.flags.get("fqn");
  const projectRoot = args.flags.get("project-root") ?? process.cwd();
  const inputPath = args.flags.get("input");
  const outputDir = args.flags.get("output-dir");

  if (kindRaw === undefined || fqn === undefined || inputPath === undefined) {
    console.error(
      `[sfai] explain-write requires --kind <${EXPLAIN_KINDS.join("|")}> --fqn <name> --input <file.json>`,
    );
    return 2;
  }
  const validKinds = new Set<string>(EXPLAIN_KINDS);
  if (!validKinds.has(kindRaw)) {
    console.error(`[sfai] invalid --kind: ${kindRaw} (allowed: ${EXPLAIN_KINDS.join(" | ")})`);
    return 2;
  }
  const kind = kindRaw as ExplainKind;

  let inputAbs: string;
  try {
    inputAbs = resolveWithinRoot(projectRoot, inputPath, "--input");
  } catch (err) {
    console.error(`[sfai] ${(err as Error).message}`);
    return 2;
  }
  if (!existsSync(inputAbs)) {
    console.error(`[sfai] input file not found: ${inputAbs}`);
    return 1;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(inputAbs, "utf8"));
  } catch (e) {
    console.error(`[sfai] invalid JSON: ${(e as Error).message}`);
    return 1;
  }
  if (typeof parsed !== "object" || parsed === null) {
    console.error("[sfai] input JSON must be an object: { blockId: content, ... }");
    return 1;
  }
  const blocks: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v !== "string") {
      console.error(`[sfai] block "${k}" must be a string`);
      return 1;
    }
    blocks[k] = v;
  }

  const result = applyExplain(
    { kind, fqn, projectRoot, outputDir },
    { blocks },
  );
  console.log(
    `[sfai] explain-write: updated=${result.updated.length} skipped=${result.skipped.length} → ${result.markdownPath}`,
  );
  if (result.skipped.length > 0) {
    console.log(`[sfai]   skipped ids: ${result.skipped.join(", ")}`);
  }
  return 0;
}

function findCommand(args: ParsedArgs): { key: string; handler: CommandHandler } | undefined {
  const candidates = [args.command.slice(0, 2).join(" "), args.command[0] ?? ""];
  for (const candidate of candidates) {
    const cmd = COMMANDS.get(candidate);
    if (cmd !== undefined) return { key: candidate, handler: cmd };
  }
  return undefined;
}

function printHelp(): void {
  console.log(`sfai ${SFAI_VERSION} — Salesforce AI-driven knowledge graph CLI

Quick start (recommended):
  sfai init --bootstrap [--profile minimal|standard|full] [--project-name <name>]
            [--language ja|en] [--api <version>]
            # init + graph build + render を 1 コマンドで実行
  sfai sync [--full-rebuild] [--quiet]
            # 日常運用: graph build --incremental + render を 1 コマンドで実行

Setup:
  sfai init [--bootstrap] [--target <dir>] [--profile minimal|standard|full]
            [--project-name <name>] [--language ja|en] [--api <version>]
            [--segment enterprise|smb|vendor] [--conflict skip|overwrite|rename]

Knowledge graph:
  sfai graph build [--incremental] [--source local|dx-mcp] [--quiet]
  sfai graph query "<SQL>"
  sfai graph schema [--format json|markdown]

Render (Phase 1〜7-A 全 7 ターゲット):
  sfai render                       # system-index + objects (後方互換)
  sfai render all                   # 全種を一括 (Phase 7-A)
  sfai render system-index          # プロジェクト全体像
  sfai render objects               # SObject 個別 (+ field / VR / dependencies)
  sfai render flows                 # Flow 個別 (Phase 7-A1)
  sfai render apex                  # ApexClass 個別 (Phase 7-A2)
  sfai render triggers              # ApexTrigger 個別 (Phase 7-A3)
  sfai render permissions           # PermissionSet + Profile (Phase 7-A4)
  sfai render validation-rules      # ValidationRule 個別 (Phase 7-A4)
  sfai render --output <dir>

Diff (Phase 3):
  sfai diff --from <ref> [--to <ref>] [--json] [--path-prefix force-app/]
            [--limit 1000] [--include-static-analysis <sarif-file>]

Onboarding (Phase 5):
  sfai onboard context --role <new_joiner|reviewer|release_manager|customer_facing>
  sfai onboard state show
  sfai onboard state record-step --role <persona> --step <id> [--entities a,b,c]
  sfai onboard state increment-questions --role <persona>
  sfai onboard state reset [--role <persona>]
  sfai onboard faq extract --input <dialog.md> [--topic <name>] [--min-occurrences 1]

Explain (Phase 8 — /sfai-explain skill 連携):
  sfai explain-write --kind apexClass|apexTrigger|flow --fqn <name>
                     --input <blocks.json> [--project-root <dir>] [--output-dir <dir>]
                     # AI_MANAGED ブロックだけを安全に上書き。他ブロックには触らない。

Other:
  sfai validate --target <graph.json>
  sfai metrics show [--period day|week|month|all]
  sfai metrics record --model <id> --command <name> --in <tokens> --out <tokens>
  sfai version
`);
}

export async function main(argv: readonly string[]): Promise<number> {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printHelp();
    return 0;
  }
  const args = parseArgs(argv);
  const cmd = findCommand(args);
  if (cmd === undefined) {
    printHelp();
    return 2;
  }
  try {
    return await cmd.handler.handler(args);
  } catch (err) {
    console.error(`[sfai] error: ${(err as Error).message}`);
    return 1;
  }
}

function isDirectInvoke(): boolean {
  const argvPath = process.argv[1];
  if (argvPath === undefined) return false;
  try {
    const resolvedArgv = realpathSync(argvPath);
    const resolvedMeta = realpathSync(fileURLToPath(import.meta.url));
    return resolvedArgv === resolvedMeta;
  } catch {
    return false;
  }
}

if (isDirectInvoke()) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
