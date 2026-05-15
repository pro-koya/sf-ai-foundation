import type { SharedToInfo, SharingCriterion, SharingRule } from "../../types/graph.js";
import { asArray, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

/**
 * SharingRules ファイル (`<Object>.sharingRules-meta.xml`) は内部に複数の
 * sharingCriteriaRules / sharingOwnerRules を持つ。各ルールを 1 SharingRule として展開する。
 */
export function extractSharingRules({
  descriptor,
  content,
}: ExtractContext): readonly SharingRule[] {
  const root = parseXml(content);
  const node = (root.SharingRules ?? {}) as Record<string, unknown>;
  const object = descriptor.fullyQualifiedName;

  const rules: SharingRule[] = [];
  for (const r of asArray(node.sharingCriteriaRules as unknown)) {
    const rule = buildCriteriaRule(r, descriptor.sourcePath, descriptor.contentHash, object);
    if (rule !== undefined) rules.push(rule);
  }
  for (const r of asArray(node.sharingOwnerRules as unknown)) {
    const rule = buildOwnerRule(r, descriptor.sourcePath, descriptor.contentHash, object);
    if (rule !== undefined) rules.push(rule);
  }
  return rules;
}

function buildCriteriaRule(
  raw: unknown,
  sourcePath: string,
  contentHash: string,
  object: string,
): SharingRule | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  const fullName = asString(r.fullName);
  if (fullName === undefined || fullName === "") return undefined;
  return {
    fullyQualifiedName: `${object}.${fullName}`,
    object,
    kind: "criteriaBased",
    label: asString(r.label),
    description: asString(r.description),
    accessLevel: asString(r.accessLevel) ?? "Unknown",
    sharedTo: extractSharedTo(r.sharedTo),
    criteriaItems: extractCriteriaItems(r.criteriaItems),
    criteriaBooleanFilter: asString(r.booleanFilter),
    sourcePath,
    contentHash,
  };
}

function buildOwnerRule(
  raw: unknown,
  sourcePath: string,
  contentHash: string,
  object: string,
): SharingRule | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  const fullName = asString(r.fullName);
  if (fullName === undefined || fullName === "") return undefined;
  return {
    fullyQualifiedName: `${object}.${fullName}`,
    object,
    kind: "ownerBased",
    label: asString(r.label),
    description: asString(r.description),
    accessLevel: asString(r.accessLevel) ?? "Unknown",
    sharedTo: extractSharedTo(r.sharedTo),
    criteriaItems: [],
    ownerSource: extractOwnerSource(r.sharedFrom),
    sourcePath,
    contentHash,
  };
}

function extractCriteriaItems(node: unknown): readonly SharingCriterion[] {
  const list = asArray(node as unknown);
  const out: SharingCriterion[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const field = asString(r.field);
    const operation = asString(r.operation);
    const value = asString(r.value) ?? "";
    if (field === undefined || operation === undefined) continue;
    out.push({ field, operation, value });
  }
  return out;
}

function extractSharedTo(node: unknown): SharedToInfo {
  if (typeof node !== "object" || node === null) return { type: "Unknown" };
  const r = node as Record<string, unknown>;
  for (const [type, key] of [
    ["role", "role"],
    ["roleAndSubordinates", "roleAndSubordinates"],
    ["roleAndSubordinatesInternal", "roleAndSubordinatesInternal"],
    ["group", "group"],
    ["allInternalUsers", "allInternalUsers"],
    ["managers", "managers"],
    ["allCustomerPortalUsers", "allCustomerPortalUsers"],
    ["allPartnerUsers", "allPartnerUsers"],
    ["territory", "territory"],
    ["territoryAndSubordinates", "territoryAndSubordinates"],
  ] as const) {
    const target = asString(r[key]);
    if (target !== undefined) {
      return { type, target };
    }
  }
  return { type: "Unknown" };
}

function extractOwnerSource(node: unknown): string | undefined {
  if (typeof node !== "object" || node === null) return undefined;
  const r = node as Record<string, unknown>;
  for (const key of [
    "role",
    "roleAndSubordinates",
    "group",
    "queue",
    "territory",
    "territoryAndSubordinates",
  ] as const) {
    const target = asString(r[key]);
    if (target !== undefined) return `${key}:${target}`;
  }
  return undefined;
}
