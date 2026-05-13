// CustomApplication / Lightning App 取り込み (Phase 12-B3)
// applications/<Name>.app-meta.xml を起点。AuraBundle の .app-meta.xml とは
// adapter classifier 側で分岐済み。

import type { CustomApplication } from "../../types/graph.js";
import { asArray, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractCustomApplication(ctx: ExtractContext): CustomApplication | undefined {
  const { descriptor, content } = ctx;
  const root = parseXml(content);
  const node = (root.CustomApplication ?? {}) as Record<string, unknown>;

  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    label: asString(node.label),
    description: asString(node.description),
    navType: asString(node.navType),
    formFactors: extractFormFactors(node),
    tabs: extractTabs(node),
    utilityBar: asString(node.utilityBar),
    brandColor: extractBrandColor(node),
    logo: asString(node.logo),
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}

function extractFormFactors(node: Record<string, unknown>): readonly string[] {
  const list = asArray(node.formFactors as unknown);
  const out: string[] = [];
  for (const f of list) {
    const s = asString(f);
    if (s !== undefined) out.push(s);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}

function extractTabs(node: Record<string, unknown>): readonly string[] {
  const list = asArray(node.tabs as unknown);
  const out: string[] = [];
  for (const t of list) {
    const s = asString(t);
    if (s !== undefined) out.push(s);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}

function extractBrandColor(node: Record<string, unknown>): string | undefined {
  const brand = node.brand as Record<string, unknown> | undefined;
  if (brand !== undefined) {
    const headerColor = asString(brand.headerColor);
    if (headerColor !== undefined) return headerColor;
  }
  const profile = node.profileActionOverrides as Record<string, unknown> | undefined;
  if (profile !== undefined) return undefined;
  return undefined;
}
