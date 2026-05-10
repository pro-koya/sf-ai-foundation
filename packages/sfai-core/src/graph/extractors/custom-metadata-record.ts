import type { CustomMetadataRecord, CustomMetadataValueInfo } from "../../types/graph.js";
import { asArray, asBoolean, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractCustomMetadataRecord({
  descriptor,
  content,
}: ExtractContext): CustomMetadataRecord | undefined {
  const root = parseXml(content);
  const node = (root.CustomMetadata ?? {}) as Record<string, unknown>;

  // FQN: `<TypeName>__mdt.<RecordDeveloperName>` を期待
  const dot = descriptor.fullyQualifiedName.indexOf(".");
  if (dot === -1) return undefined;
  const type = descriptor.fullyQualifiedName.slice(0, dot);
  const recordName = descriptor.fullyQualifiedName.slice(dot + 1);

  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    type,
    recordName,
    label: asString(node.label),
    protected: asBoolean(node.protected),
    values: extractValues(node),
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}

function extractValues(node: Record<string, unknown>): readonly CustomMetadataValueInfo[] {
  const list = asArray(node.values as unknown);
  const out: CustomMetadataValueInfo[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const field = asString(r.field);
    if (field === undefined) continue;
    out.push({ field, value: extractValue(r.value) });
  }
  return out;
}

function extractValue(raw: unknown): string {
  if (raw === undefined || raw === null) return "(null)";
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  // 構造化されている場合 ({ "@_xsi:type": "xsd:int", "#text": "..." } など) は #text を取る
  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const text = asString(r["#text"]);
    if (text !== undefined) return text;
    return JSON.stringify(raw);
  }
  return "(unknown)";
}
