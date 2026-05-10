import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { Eta } from "eta";
import { walkFiles } from "../util/walk.js";
import { type InitOptions, type InitResult, PROFILE_DEFAULTS } from "./types.js";

const ETA_SUFFIX = ".eta";
const SKIP_NAMES: ReadonlySet<string> = new Set([".gitkeep", "README.md"]);

/**
 * scaffold/ を targetDir に展開する。
 * - `.eta` で終わるファイルは eta で変数展開され、`.eta` を除いたファイル名で出力
 * - それ以外のファイルは静的コピー
 * - profile に応じて enabledCommands / enabledAgents 配下を絞り込む
 */
export async function runInit(options: InitOptions): Promise<InitResult> {
  const written: string[] = [];
  const skipped: string[] = [];
  const renamed: { readonly from: string; readonly to: string }[] = [];

  const variables = enrichVariables(options);
  const eta = new Eta({ autoTrim: false });

  for (const sourceFile of walkFiles(options.scaffoldDir)) {
    const rel = relative(options.scaffoldDir, sourceFile);
    if (shouldSkipFile(rel)) {
      skipped.push(rel);
      continue;
    }
    if (!isAllowedByProfile(rel, variables.enabledCommands, variables.enabledAgents)) {
      skipped.push(rel);
      continue;
    }

    const targetRel = rel.endsWith(ETA_SUFFIX) ? rel.slice(0, -ETA_SUFFIX.length) : rel;
    const targetPath = join(options.targetDir, targetRel);

    if (existsSync(targetPath)) {
      const policy = options.conflict ?? "skip";
      if (policy === "skip") {
        skipped.push(targetRel);
        continue;
      }
      if (policy === "rename") {
        const renamedTo = `${targetPath}.bak`;
        renamed.push({ from: targetPath, to: renamedTo });
      }
    }

    const sourceContent = readFileSync(sourceFile, "utf8");
    const finalContent = rel.endsWith(ETA_SUFFIX)
      ? renderEta(eta, sourceContent, variables)
      : sourceContent;

    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, finalContent);
    written.push(targetRel);
  }

  return { written, skipped, renamed };
}

function shouldSkipFile(rel: string): boolean {
  const segments = rel.split("/");
  const last = segments.at(-1) ?? "";
  if (SKIP_NAMES.has(last)) return true;
  if (last.startsWith(".") && last.endsWith(".bak")) return true;
  return false;
}

function isAllowedByProfile(
  rel: string,
  enabledCommands: readonly string[],
  enabledAgents: readonly string[],
): boolean {
  if (rel.startsWith(".claude/commands/")) {
    const name = rel.replace(".claude/commands/", "").replace(/\.md(\.eta)?$/, "");
    return enabledCommands.includes(name);
  }
  if (rel.startsWith(".claude/agents/")) {
    const name = rel.replace(".claude/agents/", "").replace(/\.md(\.eta)?$/, "");
    return enabledAgents.includes(name);
  }
  return true;
}

function enrichVariables(options: InitOptions): InitOptions["variables"] {
  const v = options.variables;
  if (v.enabledCommands.length > 0 && v.enabledAgents.length > 0) {
    return v;
  }
  const defaults = PROFILE_DEFAULTS.get(v.profile);
  return {
    ...v,
    enabledCommands:
      v.enabledCommands.length > 0 ? v.enabledCommands : (defaults?.enabledCommands ?? []),
    enabledAgents: v.enabledAgents.length > 0 ? v.enabledAgents : (defaults?.enabledAgents ?? []),
  };
}

function renderEta(eta: Eta, source: string, variables: object): string {
  const result = eta.renderString(source, variables);
  return result ?? "";
}
