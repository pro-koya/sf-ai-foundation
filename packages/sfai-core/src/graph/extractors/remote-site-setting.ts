import type { RemoteSiteSetting } from "../../types/graph.js";
import { asBoolean, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractRemoteSiteSetting({
  descriptor,
  content,
}: ExtractContext): RemoteSiteSetting | undefined {
  const root = parseXml(content);
  const node = (root.RemoteSiteSetting ?? {}) as Record<string, unknown>;
  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    url: asString(node.url),
    description: asString(node.description),
    active: asBoolean(node.isActive) ?? false,
    disableProtocolSecurity: asBoolean(node.disableProtocolSecurity) ?? false,
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}
