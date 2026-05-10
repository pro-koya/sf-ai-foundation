import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ContextMap, DomainDef, PersonaDef, PersonaId } from "./types.js";
import { PERSONA_IDS } from "./types.js";

export class ContextMapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContextMapError";
  }
}

export interface LoadContextMapOptions {
  readonly rootPath: string;
  readonly mapFile?: string;
}

const DEFAULT_PATH = ".sfai/context-map.yaml";

export const DEFAULT_CONTEXT_MAP: ContextMap = {
  project: { name: "your-project", domains: [] },
  personas: {
    new_joiner: {
      goal: "2 週間で主要ドメインを理解する",
      readOrder: [
        "docs/generated/system-index.md",
        "docs/human/business-notes/overview.md",
        "domains:*",
      ],
      depth: "summary_first",
      primaryAgent: "onboarding-guide",
    },
    reviewer: {
      goal: "PR を適切にレビューする",
      readOrder: [
        "docs/ai-augmented/change-summaries/latest.md",
        "ops/registry/manual-steps-registry.md",
      ],
      depth: "detail_on_demand",
      primaryAgent: "review-assistant",
    },
    release_manager: {
      goal: "リリース準備の抜け漏れを防ぐ",
      readOrder: ["docs/releases/latest.md", "ops/registry/manual-steps-registry.md"],
      depth: "checklist_first",
      primaryAgent: "release-advisor",
    },
    customer_facing: {
      goal: "顧客視点で影響を整理",
      readOrder: ["docs/ai-augmented/change-summaries/latest.md"],
      depth: "business_impact_first",
      primaryAgent: "customer-impact-explainer",
    },
  },
};

export function loadContextMap(options: LoadContextMapOptions): ContextMap {
  const path = resolve(options.rootPath, options.mapFile ?? DEFAULT_PATH);
  if (!existsSync(path)) return DEFAULT_CONTEXT_MAP;

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new ContextMapError(`Failed to read context-map.yaml: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new ContextMapError(`context-map.yaml YAML 構文エラー: ${(err as Error).message}`);
  }

  return normalize(parsed);
}

function normalize(parsed: unknown): ContextMap {
  if (parsed === null || typeof parsed !== "object") return DEFAULT_CONTEXT_MAP;
  const obj = parsed as Record<string, unknown>;
  const project = (obj.project ?? {}) as Record<string, unknown>;
  const projectName = typeof project.name === "string" ? project.name : "your-project";
  const domains = normalizeDomains(project.domains);

  const personasRaw = (obj.personas ?? {}) as Record<string, unknown>;
  const personas: Record<PersonaId, PersonaDef> = { ...DEFAULT_CONTEXT_MAP.personas };
  for (const id of PERSONA_IDS) {
    const incoming = personasRaw[id] as Record<string, unknown> | undefined;
    if (incoming === undefined) continue;
    personas[id] = mergePersona(DEFAULT_CONTEXT_MAP.personas[id], incoming);
  }

  return { project: { name: projectName, domains }, personas };
}

function normalizeDomains(value: unknown): readonly DomainDef[] {
  if (!Array.isArray(value)) return [];
  const result: DomainDef[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string") continue;
    result.push({
      id: e.id,
      description: typeof e.description === "string" ? e.description : "",
      primaryObjects: Array.isArray(e.primary_objects)
        ? (e.primary_objects.filter((s) => typeof s === "string") as string[])
        : [],
      keyDocs: Array.isArray(e.key_docs)
        ? (e.key_docs.filter((s) => typeof s === "string") as string[])
        : [],
    });
  }
  return result;
}

function mergePersona(base: PersonaDef, incoming: Record<string, unknown>): PersonaDef {
  return {
    goal: typeof incoming.goal === "string" ? incoming.goal : base.goal,
    readOrder: Array.isArray(incoming.read_order)
      ? (incoming.read_order.filter((s) => typeof s === "string") as string[])
      : base.readOrder,
    depth:
      typeof incoming.depth === "string" ? (incoming.depth as PersonaDef["depth"]) : base.depth,
    primaryAgent:
      typeof incoming.primary_agent === "string" ? incoming.primary_agent : base.primaryAgent,
  };
}

/**
 * read_order の "domains:*" を実際のドメイン読み順に展開
 */
export function expandReadOrder(persona: PersonaDef, contextMap: ContextMap): readonly string[] {
  const expanded: string[] = [];
  for (const item of persona.readOrder) {
    if (item === "domains:*") {
      for (const d of contextMap.project.domains) {
        expanded.push(`domain:${d.id}`);
      }
      continue;
    }
    if (item.startsWith("domain:")) {
      expanded.push(item);
      continue;
    }
    expanded.push(item);
  }
  return expanded;
}
