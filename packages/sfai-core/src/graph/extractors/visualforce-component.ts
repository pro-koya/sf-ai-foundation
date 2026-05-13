// Visualforce Component 取り込み (Phase 12-B2)
// .component-meta.xml を起点に .component (markup) を読み、controller / attribute を抽出する。

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  VfComponentAttribute,
  VfMarkupCount,
  VisualforceComponent,
} from "../../types/graph.js";
import { asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractVisualforceComponent(ctx: ExtractContext): VisualforceComponent | undefined {
  const { descriptor, content, projectRoot } = ctx;
  const root = parseXml(content);
  const node = (root.ApexComponent ?? {}) as Record<string, unknown>;

  const name = descriptor.fullyQualifiedName;
  const projectRootStr = projectRoot ?? ".";
  const metaAbs = resolve(projectRootStr, descriptor.sourcePath);
  const dir = dirname(metaAbs);
  const markupPath = resolve(dir, `${name}.component`);
  const markup = safeRead(markupPath);

  return {
    fullyQualifiedName: name,
    apiVersion: asString(node.apiVersion),
    label: asString(node.label),
    description: asString(node.description),
    controller: markup !== undefined ? extractControllerFromMarkup(markup) : undefined,
    attributes: markup !== undefined ? extractAttributes(markup) : [],
    hasMarkup: markup !== undefined,
    markupCounts: markup !== undefined ? countMarkupTags(markup) : [],
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}

function safeRead(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

const CONTROLLER_REGEX = /<apex:component\b[^>]*\bcontroller=["']([^"']+)["']/i;

function extractControllerFromMarkup(markup: string): string | undefined {
  const m = CONTROLLER_REGEX.exec(markup);
  return m?.[1];
}

// <apex:attribute name="x" type="String" required="true" description="..." />
const ATTRIBUTE_REGEX = /<apex:attribute\b([^>]*)\/?>/gi;

function extractAttributes(markup: string): readonly VfComponentAttribute[] {
  const out: VfComponentAttribute[] = [];
  const re = new RegExp(ATTRIBUTE_REGEX.source, "gi");
  let m: RegExpExecArray | null = re.exec(markup);
  while (m !== null) {
    const attrs = m[1] ?? "";
    const name = readAttr(attrs, "name");
    if (name !== undefined) {
      out.push({
        name,
        type: readAttr(attrs, "type"),
        required: readBoolAttr(attrs, "required"),
        description: readAttr(attrs, "description"),
      });
    }
    m = re.exec(markup);
  }
  return out.toSorted((a, b) => a.name.localeCompare(b.name));
}

function readAttr(source: string, key: string): string | undefined {
  const re = new RegExp(`\\b${key}=["']([^"']*)["']`, "i");
  const m = re.exec(source);
  return m?.[1];
}

function readBoolAttr(source: string, key: string): boolean | undefined {
  const v = readAttr(source, key);
  if (v === undefined) return undefined;
  return v.toLowerCase() === "true";
}

const VF_TAG_PATTERN = /<apex:([a-zA-Z][a-zA-Z0-9]*)\b/g;

function countMarkupTags(markup: string): readonly VfMarkupCount[] {
  const counts = new Map<string, number>();
  const re = new RegExp(VF_TAG_PATTERN.source, "g");
  let m: RegExpExecArray | null = re.exec(markup);
  while (m !== null) {
    const tag = `apex:${m[1]}`;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
    m = re.exec(markup);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .toSorted((a, b) => a.tag.localeCompare(b.tag));
}
