// Flow の Mermaid フローチャート生成 (Phase 8-B3 / Phase 9-A1 ノード詳細表)
// 要素 (FlowElementInfo) と接続 (FlowEdgeInfo) を有向グラフとして描画する。

import type { FlowBodyInfo, FlowEdgeInfo, FlowElementInfo } from "../types/graph.js";
import type { MermaidFlowchart, NodeDetail } from "./method-flowchart.js";

const KIND_TO_SHAPE: Record<FlowElementInfo["kind"], (label: string) => string> = {
  recordLookup: (l) => `[/"🔍 ${l}"/]`,
  recordCreate: (l) => `[/"➕ ${l}"/]`,
  recordUpdate: (l) => `[/"✏️ ${l}"/]`,
  recordDelete: (l) => `[/"🗑 ${l}"/]`,
  decision: (l) => `{"❓ ${l}"}`,
  assignment: (l) => `["📝 ${l}"]`,
  loop: (l) => `{{"🔁 ${l}"}}`,
  actionCall: (l) => `[["⚙ ${l}"]]`,
  subflow: (l) => `[["▶ ${l}"]]`,
  screen: (l) => `[/"🖥 ${l}"/]`,
  wait: (l) => `["⏳ ${l}"]`,
};

const LABEL_TRUNCATE = 80;

export function buildFlowFlowchart(body: FlowBodyInfo): MermaidFlowchart {
  if ((body.edges ?? []).length === 0 && body.elements.length === 0) {
    return {
      mermaid: 'flowchart TD\n  Empty["(要素なし)"]',
      details: [],
    };
  }
  const lines: string[] = ["flowchart TD"];
  const details: NodeDetail[] = [];
  lines.push("  __start__([Start])");
  for (const e of body.elements) {
    const id = sanitize(e.name);
    const labelFull = e.label !== undefined && e.label !== "" ? `${e.name} — ${e.label}` : e.name;
    const labelShort = truncate(e.label ?? e.name, LABEL_TRUNCATE);
    const shape = KIND_TO_SHAPE[e.kind](escapeLabel(labelShort));
    lines.push(`  ${id}${shape}`);
    details.push({ id, kind: e.kind, label: labelShort, fullText: labelFull });
  }

  for (const edge of body.edges ?? []) {
    const from = edge.from === "__start__" ? "__start__" : sanitize(edge.from);
    const to = sanitize(edge.to);
    if (edge.label === undefined || edge.label === "") {
      lines.push(`  ${from} --> ${to}`);
    } else {
      const arrow = edge.kind === "fault" ? "-.->" : "-->";
      lines.push(`  ${from} ${arrow}|${escapeLabel(edge.label)}| ${to}`);
    }
  }
  return { mermaid: lines.join("\n"), details };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function sanitize(name: string): string {
  return `e_${name.replace(/[^A-Za-z0-9_]/g, "_")}`;
}

function escapeLabel(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/[\n\r]/g, " ");
}
