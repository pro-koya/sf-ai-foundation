// Flow XML 構造解析 (Phase 7-A+2 / Phase 8-B3 で edges 拡張)
// recordLookups / recordCreates / recordUpdates / recordDeletes /
// decisions / assignments / loops / actionCalls / subflows / screens / waits
// を取り出して Markdown / Mermaid 化に使えるよう整える。
//
// Phase 8-B3: connector / defaultConnector / faultConnector / rules を読み、
// 要素間の有向グラフを edges として返す。

import type {
  FlowBodyInfo,
  FlowEdgeInfo,
  FlowElementInfo,
  FlowElementKind,
} from "../../types/graph.js";
import { asArray, asString } from "../parse-xml.js";

interface FlowNodeBase {
  readonly name?: unknown;
  readonly label?: unknown;
}

const SECTION_TO_KIND: ReadonlyArray<readonly [string, FlowElementKind]> = [
  ["recordLookups", "recordLookup"],
  ["recordCreates", "recordCreate"],
  ["recordUpdates", "recordUpdate"],
  ["recordDeletes", "recordDelete"],
  ["decisions", "decision"],
  ["assignments", "assignment"],
  ["loops", "loop"],
  ["actionCalls", "actionCall"],
  ["subflows", "subflow"],
  ["screens", "screen"],
  ["waits", "wait"],
];

export function extractFlowBody(flowNode: Record<string, unknown>): FlowBodyInfo {
  const elements: FlowElementInfo[] = [];
  const subflows: string[] = [];
  const recordObjects = new Set<string>();
  const actionCalls: string[] = [];
  const edges: FlowEdgeInfo[] = [];

  for (const [sectionName, kind] of SECTION_TO_KIND) {
    const list = asArray(flowNode[sectionName] as FlowNodeBase | readonly FlowNodeBase[]);
    for (const node of list) {
      if (typeof node !== "object" || node === null) continue;
      const rec = node as Record<string, unknown>;
      const name = asString(rec.name) ?? "";
      const label = asString(rec.label);
      const target = inferTarget(rec, kind);
      if (name === "") continue;
      elements.push({ name, kind, label, target });
      if (kind === "subflow") {
        const fqn = asString(rec.flowName);
        if (fqn !== undefined) subflows.push(fqn);
      }
      if (kind === "actionCall") {
        const action = asString(rec.actionName);
        if (action !== undefined) actionCalls.push(action);
      }
      if (
        kind === "recordLookup" ||
        kind === "recordCreate" ||
        kind === "recordUpdate" ||
        kind === "recordDelete"
      ) {
        const obj = asString(rec.object);
        if (obj !== undefined) recordObjects.add(obj);
      }

      // Phase 8-B3: connector を読んで edges を構築
      collectEdgesFor(rec, name, kind, edges);
    }
  }

  // start からの最初の遷移
  const startNode = flowNode.start as Record<string, unknown> | undefined;
  let startTarget: string | undefined;
  if (startNode !== undefined) {
    const target = readConnectorTarget(startNode.connector);
    if (target !== undefined) {
      startTarget = target;
      edges.push({ from: "__start__", to: target, kind: "start", label: "start" });
    }
  }

  return {
    elements,
    subflows: dedupe(subflows),
    recordObjects: [...recordObjects].toSorted((a, b) => a.localeCompare(b)),
    actionCalls: dedupe(actionCalls),
    edges,
    startTarget,
  };
}

function collectEdgesFor(
  rec: Record<string, unknown>,
  name: string,
  kind: FlowElementKind,
  edges: FlowEdgeInfo[],
): void {
  // 一般要素: connector → 通常遷移
  const next = readConnectorTarget(rec.connector);
  if (next !== undefined) edges.push({ from: name, to: next, kind: "next" });

  // fault path
  const fault = readConnectorTarget(rec.faultConnector);
  if (fault !== undefined) edges.push({ from: name, to: fault, kind: "fault", label: "fault" });

  // decision
  if (kind === "decision") {
    const rules = asArray(rec.rules as unknown);
    for (const r of rules) {
      if (typeof r !== "object" || r === null) continue;
      const rule = r as Record<string, unknown>;
      const ruleName = asString(rule.name) ?? "";
      const ruleLabel = asString(rule.label) ?? ruleName;
      const target = readConnectorTarget(rule.connector);
      if (target !== undefined) {
        edges.push({ from: name, to: target, kind: "rule", label: ruleLabel });
      }
    }
    const def = readConnectorTarget(rec.defaultConnector);
    if (def !== undefined) {
      const defLabel = asString(rec.defaultConnectorLabel) ?? "default";
      edges.push({ from: name, to: def, kind: "default", label: defLabel });
    }
  }

  // loop は通常 connector を使わず nextValue/noMoreValues
  if (kind === "loop") {
    const nv = readConnectorTarget(rec.nextValueConnector);
    if (nv !== undefined) edges.push({ from: name, to: nv, kind: "loop", label: "next value" });
    const nmv = readConnectorTarget(rec.noMoreValuesConnector);
    if (nmv !== undefined)
      edges.push({ from: name, to: nmv, kind: "noMore", label: "no more values" });
  }
}

function readConnectorTarget(node: unknown): string | undefined {
  if (typeof node !== "object" || node === null) return undefined;
  const rec = node as Record<string, unknown>;
  return asString(rec.targetReference);
}

function inferTarget(rec: Record<string, unknown>, kind: FlowElementKind): string | undefined {
  switch (kind) {
    case "recordLookup":
    case "recordCreate":
    case "recordUpdate":
    case "recordDelete":
      return asString(rec.object);
    case "subflow":
      return asString(rec.flowName);
    case "actionCall":
      return asString(rec.actionName);
    default:
      return undefined;
  }
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values)].toSorted((a, b) => a.localeCompare(b));
}
