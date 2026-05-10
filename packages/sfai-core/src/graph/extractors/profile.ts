import type { Profile } from "../../types/graph.js";
import { asString, parseXml } from "../parse-xml.js";
import { extractPermissionSetBody } from "./permission-set-body.js";
import type { ExtractContext } from "./types.js";

export function extractProfile({ descriptor, content }: ExtractContext): Profile | undefined {
  const root = parseXml(content);
  const node = (root.Profile ?? {}) as Record<string, unknown>;
  const body = extractPermissionSetBody(node);
  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    userLicense: asString(node.userLicense),
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
    body,
  };
}
