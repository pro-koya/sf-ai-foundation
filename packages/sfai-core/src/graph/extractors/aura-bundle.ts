// Aura bundle 軽量取り込み (Phase 11-B)
// .cmp-meta.xml / .app-meta.xml / .evt-meta.xml を起点に bundle 構成と attribute / handler を抽出する。

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { AuraBundle, AuraBundleKind } from "../../types/graph.js";
import { asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractAuraBundle(ctx: ExtractContext): AuraBundle | undefined {
  const { descriptor, content, projectRoot } = ctx;
  const root = parseXml(content);
  // .cmp-meta.xml → AuraDefinitionBundle / .app-meta.xml → 同形式 / .evt-meta.xml → 同形式
  const node = (root.AuraDefinitionBundle ?? {}) as Record<string, unknown>;
  const name = descriptor.fullyQualifiedName;
  const projectRootStr = projectRoot ?? ".";
  const metaAbs = resolve(projectRootStr, descriptor.sourcePath);
  const dir = dirname(metaAbs);

  const bundleKind = inferBundleKind(descriptor.sourcePath);
  const markup = readMarkup(dir, name, bundleKind);

  return {
    fullyQualifiedName: name,
    bundleKind,
    apiVersion: asString(node.apiVersion),
    description: asString(node.description),
    hasController: existsSync(resolve(dir, `${name}Controller.js`)),
    hasHelper: existsSync(resolve(dir, `${name}Helper.js`)),
    hasRenderer: existsSync(resolve(dir, `${name}Renderer.js`)),
    hasStyle: existsSync(resolve(dir, `${name}.css`)),
    attributes: markup !== undefined ? extractAttributes(markup) : [],
    handlers: markup !== undefined ? extractHandlers(markup) : [],
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}

function inferBundleKind(sourcePath: string): AuraBundleKind {
  if (sourcePath.endsWith(".cmp-meta.xml")) return "Component";
  if (sourcePath.endsWith(".app-meta.xml")) return "Application";
  if (sourcePath.endsWith(".evt-meta.xml")) return "Event";
  return "Component";
}

function readMarkup(dir: string, name: string, kind: AuraBundleKind): string | undefined {
  const ext = kind === "Application" ? "app" : kind === "Event" ? "evt" : "cmp";
  const path = resolve(dir, `${name}.${ext}`);
  if (!existsSync(path)) return undefined;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

const ATTR_REGEX = /<aura:attribute\s+[^>]*name=["']([\w$]+)["']/g;

function extractAttributes(markup: string): readonly string[] {
  const out: string[] = [];
  const re = new RegExp(ATTR_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(markup);
  while (m !== null) {
    if (m[1]) out.push(m[1]);
    m = re.exec(markup);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}

const HANDLER_REGEX = /<aura:handler\s+[^>]*event=["']([^"']+)["']/g;

function extractHandlers(markup: string): readonly string[] {
  const out: string[] = [];
  const re = new RegExp(HANDLER_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(markup);
  while (m !== null) {
    if (m[1]) out.push(m[1]);
    m = re.exec(markup);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}
