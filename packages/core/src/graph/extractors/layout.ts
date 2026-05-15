import type {
  Layout,
  LayoutItemInfo,
  LayoutRelatedListInfo,
  LayoutSectionInfo,
} from "../../types/graph.js";
import { asArray, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractLayout({ descriptor, content }: ExtractContext): Layout | undefined {
  const root = parseXml(content);
  const node = (root.Layout ?? {}) as Record<string, unknown>;

  // FQN は `<Object>-<LayoutName>`。最初の `-` で分割。
  const dash = descriptor.fullyQualifiedName.indexOf("-");
  if (dash === -1) return undefined;
  const object = descriptor.fullyQualifiedName.slice(0, dash);
  const layoutName = descriptor.fullyQualifiedName.slice(dash + 1);

  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    object,
    layoutName,
    sections: extractSections(node),
    relatedLists: extractRelatedLists(node),
    quickActions: extractQuickActions(node),
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}

function extractSections(node: Record<string, unknown>): readonly LayoutSectionInfo[] {
  const list = asArray(node.layoutSections as unknown);
  const out: LayoutSectionInfo[] = [];
  for (const sec of list) {
    if (typeof sec !== "object" || sec === null) continue;
    const s = sec as Record<string, unknown>;
    const label = asString(s.label) ?? "(無名)";
    const columnsStyle = asString(s.style);
    const items: LayoutItemInfo[] = [];
    const columns = asArray(s.layoutColumns as unknown);
    columns.forEach((col, colIdx) => {
      if (typeof col !== "object" || col === null) return;
      const c = col as Record<string, unknown>;
      const layoutItems = asArray(c.layoutItems as unknown);
      for (const item of layoutItems) {
        if (typeof item !== "object" || item === null) continue;
        const i = item as Record<string, unknown>;
        const field = asString(i.field);
        if (field === undefined) continue;
        items.push({
          field,
          behavior: asString(i.behavior) ?? "Edit",
          column: colIdx + 1,
        });
      }
    });
    out.push({ label, columnsStyle, items });
  }
  return out;
}

function extractRelatedLists(node: Record<string, unknown>): readonly LayoutRelatedListInfo[] {
  const list = asArray(node.relatedLists as unknown);
  const out: LayoutRelatedListInfo[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const relatedList = asString(r.relatedList);
    if (relatedList === undefined) continue;
    const fields = asArray(r.fields as unknown)
      .map((f) => asString(f))
      .filter((s): s is string => s !== undefined);
    out.push({ relatedList, fields });
  }
  return out;
}

function extractQuickActions(node: Record<string, unknown>): readonly string[] {
  const ql = node.quickActionList as Record<string, unknown> | undefined;
  if (ql === undefined) return [];
  const items = asArray(ql.quickActionListItems as unknown);
  const out: string[] = [];
  for (const i of items) {
    if (typeof i !== "object" || i === null) continue;
    const r = i as Record<string, unknown>;
    const name = asString(r.quickActionName);
    if (name !== undefined) out.push(name);
  }
  return out;
}
