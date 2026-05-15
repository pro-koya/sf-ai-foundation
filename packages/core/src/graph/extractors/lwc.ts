// LWC (Lightning Web Component) bundle 取り込み (Phase 11-A)
// .js-meta.xml を起点に同ディレクトリの .js / .html / .css を読み、
// @api / @wire / Apex import / 子コンポーネント / イベント発火を抽出する。

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  LightningWebComponent,
  LwcApexImportInfo,
  LwcStandardComponentCount,
  LwcWireInfo,
} from "../../types/graph.js";
import { asArray, asBoolean, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractLwc(ctx: ExtractContext): LightningWebComponent | undefined {
  const { descriptor, content, projectRoot } = ctx;
  const root = parseXml(content);
  const node = (root.LightningComponentBundle ?? {}) as Record<string, unknown>;

  const name = descriptor.fullyQualifiedName;
  // 兄弟ファイルパス: <projectRoot>/<dir>/<name>.{js,html,css}
  const projectRootStr = projectRoot ?? ".";
  const metaAbs = resolve(projectRootStr, descriptor.sourcePath);
  const dir = dirname(metaAbs);
  const jsPath = resolve(dir, `${name}.js`);
  const htmlPath = resolve(dir, `${name}.html`);
  const cssPath = resolve(dir, `${name}.css`);

  const js = safeRead(jsPath);
  const html = safeRead(htmlPath);

  return {
    fullyQualifiedName: name,
    apiVersion: asString(node.apiVersion),
    masterLabel: asString(node.masterLabel),
    description: asString(node.description),
    isExposed: asBoolean(node.isExposed) ?? false,
    targets: extractTargets(node),
    hasHtml: html !== undefined,
    hasCss: existsSync(cssPath),
    apexImports: js !== undefined ? extractApexImports(js) : [],
    labelImports: js !== undefined ? extractLabelImports(js) : [],
    publicProperties: js !== undefined ? extractPublicProperties(js) : [],
    wires: js !== undefined ? extractWires(js) : [],
    customEvents: js !== undefined ? extractCustomEvents(js) : [],
    childComponents: html !== undefined ? extractChildComponents(html) : [],
    standardComponents: html !== undefined ? extractStandardComponents(html) : [],
    directives: html !== undefined ? extractDirectives(html) : [],
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

function extractTargets(node: Record<string, unknown>): readonly string[] {
  const targets = node.targets as Record<string, unknown> | undefined;
  if (targets === undefined) return [];
  const list = asArray(targets.target as unknown);
  const out: string[] = [];
  for (const t of list) {
    const s = asString(t);
    if (s !== undefined) out.push(s);
  }
  return out;
}

const APEX_IMPORT_REGEX = /import\s+(\w+)\s+from\s+['"]@salesforce\/apex\/([\w$]+)\.([\w$]+)['"]/g;

function extractApexImports(js: string): readonly LwcApexImportInfo[] {
  const out: LwcApexImportInfo[] = [];
  const re = new RegExp(APEX_IMPORT_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(js);
  while (m !== null) {
    out.push({
      methodAlias: m[1] ?? "",
      className: m[2] ?? "",
      methodName: m[3] ?? "",
    });
    m = re.exec(js);
  }
  return out;
}

const LABEL_IMPORT_REGEX = /import\s+\w+\s+from\s+['"]@salesforce\/label\/([\w$.]+)['"]/g;

function extractLabelImports(js: string): readonly string[] {
  const out: string[] = [];
  const re = new RegExp(LABEL_IMPORT_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(js);
  while (m !== null) {
    if (m[1]) out.push(m[1]);
    m = re.exec(js);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}

const API_DECORATOR_REGEX = /@api\s+(?:get\s+|set\s+)?([a-zA-Z_$][\w$]*)\s*[=;(]/g;

function extractPublicProperties(js: string): readonly string[] {
  const out: string[] = [];
  const re = new RegExp(API_DECORATOR_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(js);
  while (m !== null) {
    if (m[1]) out.push(m[1]);
    m = re.exec(js);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}

const WIRE_DECORATOR_REGEX = /@wire\s*\(\s*([\w$]+)(?:[^)]*)\)\s*([\w$]+)\s*[(;=]/g;

function extractWires(js: string): readonly LwcWireInfo[] {
  const out: LwcWireInfo[] = [];
  const re = new RegExp(WIRE_DECORATOR_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(js);
  while (m !== null) {
    out.push({
      target: m[1] ?? "",
      bindingProperty: m[2],
    });
    m = re.exec(js);
  }
  return out;
}

const CUSTOM_EVENT_REGEX = /new\s+CustomEvent\s*\(\s*['"]([\w-]+)['"]/g;

function extractCustomEvents(js: string): readonly string[] {
  const out: string[] = [];
  const re = new RegExp(CUSTOM_EVENT_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(js);
  while (m !== null) {
    if (m[1]) out.push(m[1]);
    m = re.exec(js);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}

// `<c-foo-bar ...>` → "foo-bar" (子 LWC は kebab-case)
const CHILD_COMPONENT_REGEX = /<c-([a-z][a-z0-9-]*)\b/g;

function extractChildComponents(html: string): readonly string[] {
  const out: string[] = [];
  const re = new RegExp(CHILD_COMPONENT_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(html);
  while (m !== null) {
    if (m[1]) out.push(`c-${m[1]}`);
    m = re.exec(html);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}

// `<lightning-card>` 等の標準コンポーネント (lightning-, force-, lwc-, slds-)
const STANDARD_COMPONENT_REGEX = /<(lightning|force|lwc|slds)-([a-z][a-z0-9-]*)\b/g;

function extractStandardComponents(html: string): readonly LwcStandardComponentCount[] {
  const counts = new Map<string, number>();
  const re = new RegExp(STANDARD_COMPONENT_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(html);
  while (m !== null) {
    const tag = `${m[1]}-${m[2]}`;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
    m = re.exec(html);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .toSorted((a, b) => a.tag.localeCompare(b.tag));
}

const LWC_DIRECTIVE_REGEX =
  /\b(lwc:if|lwc:elseif|lwc:else|lwc:for-each|lwc:dom|lwc:slot-bind|for:each|if:true|if:false)\b/g;

function extractDirectives(html: string): readonly string[] {
  const out: string[] = [];
  const re = new RegExp(LWC_DIRECTIVE_REGEX.source, "g");
  let m: RegExpExecArray | null = re.exec(html);
  while (m !== null) {
    if (m[1]) out.push(m[1]);
    m = re.exec(html);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}
