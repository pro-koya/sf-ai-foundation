// オブジェクト関係性 ER 図 (Phase 12-B4)
// graph.fields の referenceTo を集約して Mermaid erDiagram を生成する。
// Master-Detail と Lookup を区別し、双方向の参照関係を可視化する。

import type { Field, KnowledgeGraph, SObject } from "../types/graph.js";

interface RelationEdge {
  readonly from: string;
  readonly to: string;
  readonly fieldName: string;
  readonly kind: "master-detail" | "lookup";
}

export function buildErDiagram(graph: KnowledgeGraph): string {
  const edges = collectEdges(graph.fields);
  if (edges.length === 0) return ""; // ER 図に意味が無い場合は空文字

  const objectsToShow = collectInvolvedObjects(graph.objects, edges);
  const lines: string[] = ["erDiagram"];

  // ノード定義 (sanitize: Mermaid のオブジェクト名は英数記号のみ安全)
  for (const obj of objectsToShow) {
    const safe = sanitize(obj.fullyQualifiedName);
    lines.push(`  ${safe} {`);
    lines.push(`    string ${safe}_label "${escapeLabel(obj.label ?? obj.fullyQualifiedName)}"`);
    lines.push("  }");
  }

  // エッジ定義
  for (const edge of edges) {
    const fromSafe = sanitize(edge.from);
    const toSafe = sanitize(edge.to);
    // erDiagram の関係表記: 親 ||--o{ 子 : "FK"
    // Master-Detail: 親 ||--|{ 子 (1..* 必須)
    // Lookup:        親 ||--o{ 子 (0..* 任意)
    const arrow = edge.kind === "master-detail" ? "||--|{" : "||--o{";
    lines.push(`  ${toSafe} ${arrow} ${fromSafe} : "${edge.fieldName}"`);
  }

  return lines.join("\n");
}

function collectEdges(fields: readonly Field[]): readonly RelationEdge[] {
  const edges: RelationEdge[] = [];
  for (const f of fields) {
    if (f.referenceTo === undefined || f.referenceTo.length === 0) continue;
    const kind: RelationEdge["kind"] =
      f.type === "MasterDetail" || f.type === "Master-Detail" ? "master-detail" : "lookup";
    for (const target of f.referenceTo) {
      edges.push({
        from: f.object,
        to: target,
        fieldName: f.fullyQualifiedName.split(".").pop() ?? f.fullyQualifiedName,
        kind,
      });
    }
  }
  return edges;
}

function collectInvolvedObjects(
  objects: readonly SObject[],
  edges: readonly RelationEdge[],
): readonly SObject[] {
  const involved = new Set<string>();
  for (const e of edges) {
    involved.add(e.from);
    involved.add(e.to);
  }
  const map = new Map(objects.map((o) => [o.fullyQualifiedName, o]));
  const result: SObject[] = [];
  for (const fqn of [...involved].toSorted((a, b) => a.localeCompare(b))) {
    const obj = map.get(fqn);
    if (obj !== undefined) {
      result.push(obj);
    } else {
      // 参照先で objects に登録されていない (例: 標準オブジェクト) → stub を作って表示
      result.push({
        fullyQualifiedName: fqn,
        label: fqn,
        isCustom: fqn.endsWith("__c"),
        sourcePath: "<inferred>",
        contentHash: "sha256:inferred",
      });
    }
  }
  return result;
}

// Mermaid のエンティティ名は英数 + アンダースコアのみ。`__c` などはそのまま安全。
function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeLabel(s: string): string {
  return s.replace(/"/g, "'").slice(0, 80);
}
