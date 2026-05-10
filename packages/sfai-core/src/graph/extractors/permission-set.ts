import type { PermissionSet } from "../../types/graph.js";
import { asString, parseXml } from "../parse-xml.js";
import { extractPermissionSetBody } from "./permission-set-body.js";
import type { ExtractContext } from "./types.js";

export function extractPermissionSet({
  descriptor,
  content,
}: ExtractContext): PermissionSet | undefined {
  const root = parseXml(content);
  const node = (root.PermissionSet ?? {}) as Record<string, unknown>;
  const body = extractPermissionSetBody(node);
  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    label: asString(node.label) ?? descriptor.fullyQualifiedName,
    description: asString(node.description),
    license: asString(node.license),
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
    body,
  };
}
