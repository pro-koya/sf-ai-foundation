import type { ApexTrigger, ApexTriggerEvent } from "../../types/graph.js";
import { extractApexBody } from "./apex-body.js";
import { readApiVersion } from "./apex-class.js";
import type { ExtractContext } from "./types.js";

const TRIGGER_HEADER_REGEX = /trigger\s+(\w+)\s+on\s+(\w+)\s*\(([^)]+)\)/i;

export function extractApexTrigger(ctx: ExtractContext): ApexTrigger | undefined {
  const { descriptor, content } = ctx;
  if (descriptor.sourcePath.endsWith("-meta.xml")) return undefined;
  const match = TRIGGER_HEADER_REGEX.exec(content);
  if (match === null) return undefined;
  const object = match[2];
  const eventList = match[3];
  if (object === undefined || eventList === undefined) return undefined;

  const events = parseTriggerEvents(eventList);
  const body = extractApexBody(content);
  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    object,
    events,
    apiVersion: readApiVersion(descriptor.sourcePath, "ApexTrigger", ctx.projectRoot ?? "."),
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
    body,
  };
}

function parseTriggerEvents(list: string): readonly ApexTriggerEvent[] {
  return list
    .split(",")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .map((token) => {
      const [timing, kind] = token.split(" ");
      if (timing === undefined || kind === undefined) return undefined;
      const eventName =
        `${timing}${kind.charAt(0).toUpperCase()}${kind.slice(1)}` as ApexTriggerEvent;
      return eventName;
    })
    .filter((e): e is ApexTriggerEvent => e !== undefined);
}
