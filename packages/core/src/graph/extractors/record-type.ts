import type { RecordType } from "../../types/graph.js";
import { asBoolean, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractRecordType({ descriptor, content }: ExtractContext): RecordType | undefined {
  const root = parseXml(content);
  const node = (root.RecordType ?? {}) as Record<string, unknown>;
  // FQN は `Object.RecordTypeName` 形式
  const [object] = descriptor.fullyQualifiedName.split(".");
  if (object === undefined || object === "") return undefined;

  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    object,
    label: asString(node.label),
    description: asString(node.description),
    active: asBoolean(node.active) ?? true,
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}
