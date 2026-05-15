import type { Flow } from "../../types/graph.js";
import { asString, parseXml } from "../parse-xml.js";
import { extractFlowBody } from "./flow-body.js";
import type { ExtractContext } from "./types.js";

export function extractFlow({ descriptor, content }: ExtractContext): Flow | undefined {
  const root = parseXml(content);
  const node = (root.Flow ?? {}) as Record<string, unknown>;
  const trigger = node.start as Record<string, unknown> | undefined;
  const body = extractFlowBody(node);
  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    label: asString(node.label),
    description: asString(node.description),
    type: asString(node.processType) ?? "AutoLaunchedFlow",
    status: (asString(node.status) ?? "Active") as Flow["status"],
    triggeringObject: trigger !== undefined ? asString(trigger.object) : undefined,
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
    body,
  };
}
