import type { SObject } from "../../types/graph.js";
import { asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractObject({ descriptor, content }: ExtractContext): SObject | undefined {
  const root = parseXml(content);
  const node = (root.CustomObject ?? {}) as Record<string, unknown>;
  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    label: asString(node.label) ?? descriptor.fullyQualifiedName,
    pluralLabel: asString(node.pluralLabel),
    description: asString(node.description),
    isCustom: descriptor.fullyQualifiedName.endsWith("__c"),
    sharingModel: asString(node.sharingModel) as SObject["sharingModel"],
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}
