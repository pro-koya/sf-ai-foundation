// Mermaid 起点別フロー図生成 (Phase 7-C)
// トリガーや LWC/Flow 起点から、参照クラス → SOQL/DML までの 1 段階呼び出し関係を可視化する。
// 完全な call-graph ではなく "起点 1 + 直近呼び出し先" レベル。深い階層は別途 system-overview で対応予定。

import type { ApexBodyInfo, ApexClass, ApexTrigger, KnowledgeGraph } from "../types/graph.js";

/** 1 つのトリガーから call-graph を mermaid flowchart に変換 */
export function buildTriggerMermaid(trigger: ApexTrigger, graph: KnowledgeGraph): string {
  const lines: string[] = ["flowchart LR"];
  const triggerNode = nodeId("Trigger", trigger.fullyQualifiedName);
  lines.push(`  ${triggerNode}[["Trigger: ${trigger.fullyQualifiedName}"]]`);
  const objectNode = nodeId("Object", trigger.object);
  lines.push(`  ${objectNode}{{"SObject: ${trigger.object}"}}`);
  // SObject の DML イベントが Trigger を発火させる関係を表現するため Object → Trigger 方向。
  lines.push(`  ${objectNode} -->|${trigger.events.join("/")}| ${triggerNode}`);

  if (trigger.body) {
    appendBodyEdges(lines, triggerNode, trigger.body, graph, new Set([trigger.fullyQualifiedName]));
  }
  return lines.join("\n");
}

function appendBodyEdges(
  lines: string[],
  fromNode: string,
  body: ApexBodyInfo,
  graph: KnowledgeGraph,
  visited: Set<string>,
): void {
  const referencedClasses = new Set(body.classReferences.map((r) => r.className));
  for (const className of referencedClasses) {
    const cls = findClass(graph, className);
    if (cls === undefined) continue;
    if (visited.has(cls.fullyQualifiedName)) continue;
    visited.add(cls.fullyQualifiedName);
    const node = nodeId("Class", cls.fullyQualifiedName);
    lines.push(`  ${node}["Apex: ${cls.fullyQualifiedName}"]`);
    lines.push(`  ${fromNode} --> ${node}`);
    if (cls.body) {
      appendDataNodes(lines, node, cls.body);
    }
  }
  appendDataNodes(lines, fromNode, body);
}

function appendDataNodes(lines: string[], fromNode: string, body: ApexBodyInfo): void {
  const objects = new Set<string>();
  for (const q of body.soqlQueries) {
    if (q.primaryObject !== null && q.primaryObject !== "") objects.add(q.primaryObject);
  }
  for (const d of body.dmlOperations) {
    if (d.target !== "") objects.add(d.target);
  }
  for (const obj of objects) {
    const node = nodeId("Obj", obj);
    lines.push(`  ${node}{{"${obj}"}}`);
    lines.push(`  ${fromNode} -.->|SOQL/DML| ${node}`);
  }
}

function findClass(graph: KnowledgeGraph, className: string): ApexClass | undefined {
  return graph.apexClasses.find((c) => c.fullyQualifiedName === className);
}

function nodeId(prefix: string, name: string): string {
  // Mermaid のノード ID は英数字のみ許容
  const sanitized = name.replace(/[^A-Za-z0-9]/g, "_");
  return `${prefix}_${sanitized}`;
}

/** 全トリガー/Flow を 1 枚の概観図にまとめる (Phase 7-C 概観編) */
export function buildSystemOverviewMermaid(graph: KnowledgeGraph): string {
  const lines: string[] = ["flowchart LR"];
  const seen = new Set<string>();

  for (const trg of graph.apexTriggers) {
    const trgNode = nodeId("Trigger", trg.fullyQualifiedName);
    if (!seen.has(trgNode)) {
      lines.push(`  ${trgNode}[["${trg.fullyQualifiedName}"]]`);
      seen.add(trgNode);
    }
    const objNode = nodeId("Obj", trg.object);
    if (!seen.has(objNode)) {
      lines.push(`  ${objNode}{{"${trg.object}"}}`);
      seen.add(objNode);
    }
    // Object DML イベントが Trigger を発火させる関係: Object → Trigger
    lines.push(`  ${objNode} --> ${trgNode}`);
  }

  for (const flow of graph.flows) {
    const node = nodeId("Flow", flow.fullyQualifiedName);
    if (!seen.has(node)) {
      lines.push(`  ${node}(("${flow.fullyQualifiedName}"))`);
      seen.add(node);
    }
    if (flow.triggeringObject !== undefined) {
      const objNode = nodeId("Obj", flow.triggeringObject);
      if (!seen.has(objNode)) {
        lines.push(`  ${objNode}{{"${flow.triggeringObject}"}}`);
        seen.add(objNode);
      }
      // Record-triggered Flow: SObject の DML イベントが Flow を発火させる: Object → Flow
      lines.push(`  ${objNode} --> ${node}`);
    }
  }

  if (lines.length === 1) {
    lines.push('  Empty["(対象なし)"]');
  }
  return lines.join("\n");
}
