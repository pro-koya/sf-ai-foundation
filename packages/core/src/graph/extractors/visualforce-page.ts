// Visualforce Page 取り込み (Phase 12-B1)
// .page-meta.xml を起点に同ディレクトリの .page (markup) を読む。

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { VfMarkupCount, VisualforcePage } from "../../types/graph.js";
import { asArray, asBoolean, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractVisualforcePage(ctx: ExtractContext): VisualforcePage | undefined {
  const { descriptor, content, projectRoot } = ctx;
  const root = parseXml(content);
  const node = (root.ApexPage ?? {}) as Record<string, unknown>;

  const name = descriptor.fullyQualifiedName;
  const projectRootStr = projectRoot ?? ".";
  const metaAbs = resolve(projectRootStr, descriptor.sourcePath);
  const dir = dirname(metaAbs);
  const pageMarkupPath = resolve(dir, `${name}.page`);
  const markup = safeRead(pageMarkupPath);

  return {
    fullyQualifiedName: name,
    apiVersion: asString(node.apiVersion),
    label: asString(node.label),
    description: asString(node.description),
    controller: asString(node.controller),
    extensions: extractExtensions(node),
    standardController: asString(node.standardController),
    renderAs: markup !== undefined ? extractRenderAsFromMarkup(markup) : undefined,
    availableInTouch: asBoolean(node.availableInTouch),
    confirmationTokenRequired: asBoolean(node.confirmationTokenRequired),
    hasMarkup: markup !== undefined,
    markupCounts: markup !== undefined ? countMarkupTags(markup) : [],
    methodReferences: markup !== undefined ? extractMethodReferences(markup) : [],
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

function extractExtensions(node: Record<string, unknown>): readonly string[] {
  const list = asArray(node.extensions as unknown);
  const out: string[] = [];
  for (const e of list) {
    const s = asString(e);
    if (s !== undefined) {
      // extensions は "Foo,Bar" の形でも来うる
      for (const piece of s.split(",")) {
        const trimmed = piece.trim();
        if (trimmed !== "") out.push(trimmed);
      }
    }
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}

const RENDER_AS_REGEX = /<apex:page\b[^>]*\brenderAs=["']([^"']+)["']/i;

function extractRenderAsFromMarkup(markup: string): string | undefined {
  const m = RENDER_AS_REGEX.exec(markup);
  return m?.[1];
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

// {!someController.method} / {!method} → メソッド名候補を抽出
const METHOD_REF_REGEX = /\{!([a-zA-Z_$][\w$.]*)\}/g;

function extractMethodReferences(markup: string): readonly string[] {
  const out: string[] = [];
  const re = new RegExp(METHOD_REF_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(markup);
  while (m !== null) {
    if (m[1] !== undefined) out.push(m[1]);
    m = re.exec(markup);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}
