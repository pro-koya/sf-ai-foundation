// FlexiPage 取り込み (Phase 11-C)
// Lightning App Builder のレコード/アプリ/ホームページ。

import type { FlexiPage, FlexiPageItemInfo, FlexiPageRegionInfo } from "../../types/graph.js";
import { asArray, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractFlexiPage({ descriptor, content }: ExtractContext): FlexiPage | undefined {
  const root = parseXml(content);
  const node = (root.FlexiPage ?? {}) as Record<string, unknown>;

  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    type: asString(node.type),
    sobjectType: asString(node.sobjectType),
    pageTemplate: asString(node.pageTemplate),
    masterLabel: asString(node.masterLabel),
    description: asString(node.description),
    regions: extractRegions(node),
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}

function extractRegions(node: Record<string, unknown>): readonly FlexiPageRegionInfo[] {
  const list = asArray(node.flexiPageRegions as unknown);
  const out: FlexiPageRegionInfo[] = [];
  for (const r of list) {
    if (typeof r !== "object" || r === null) continue;
    const rec = r as Record<string, unknown>;
    const name = asString(rec.name) ?? "(unnamed)";
    const type = asString(rec.type);
    const items: FlexiPageItemInfo[] = [];
    const itemInstances = asArray(rec.itemInstances as unknown);
    for (const it of itemInstances) {
      if (typeof it !== "object" || it === null) continue;
      const itr = it as Record<string, unknown>;
      const compInst = itr.componentInstance as Record<string, unknown> | undefined;
      const fieldInst = itr.fieldInstance as Record<string, unknown> | undefined;
      const componentName = compInst !== undefined ? asString(compInst.componentName) : undefined;
      const fieldName = fieldInst !== undefined ? asString(fieldInst.fieldItem) : undefined;
      if (componentName === undefined && fieldName === undefined) continue;
      items.push({ componentName, fieldName });
    }
    out.push({ name, type, items });
  }
  return out;
}
