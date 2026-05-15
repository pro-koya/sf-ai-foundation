import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ApexClass } from "../../types/graph.js";
import { asString, parseXml } from "../parse-xml.js";
import { extractApexBody } from "./apex-body.js";
import { extractMethodControlFlows } from "./apex-control-flow.js";
import { DEFAULT_API_VERSION, type ExtractContext } from "./types.js";

export function extractApexClass(ctx: ExtractContext): ApexClass | undefined {
  const { descriptor, content } = ctx;
  const isMetaXml = descriptor.sourcePath.endsWith("-meta.xml");
  if (isMetaXml) return undefined;

  const linesOfCode = content.split("\n").length;
  const isTest = /@isTest\b/i.test(content);
  const apiVersion = readApiVersion(descriptor.sourcePath, "ApexClass", ctx.projectRoot ?? ".");
  const baseBody = extractApexBody(content);
  const controlFlows = extractMethodControlFlows(content);
  const body = { ...baseBody, controlFlows };

  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    apiVersion,
    isTest,
    linesOfCode,
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
    body,
  };
}

export function readApiVersion(
  classOrTriggerPath: string,
  rootElement: "ApexClass" | "ApexTrigger",
  projectRoot = ".",
): string {
  const metaPath = resolve(projectRoot, `${classOrTriggerPath}-meta.xml`);
  if (!existsSync(metaPath)) {
    return DEFAULT_API_VERSION;
  }
  try {
    const metaContent = readFileSync(metaPath, "utf8");
    const parsed = parseXml(metaContent);
    const root = parsed[rootElement] as Record<string, unknown> | undefined;
    return asString(root?.apiVersion) ?? DEFAULT_API_VERSION;
  } catch {
    return DEFAULT_API_VERSION;
  }
}
