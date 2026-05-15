// Flow の処理シーケンス表 builder (Phase 13-B)
// elements を edges に従って実行順に並べ、各要素を 1 行にまとめる。

import type { Flow, FlowBodyInfo, FlowElementInfo } from "../types/graph.js";

export interface FlowSequenceRow {
  readonly order: number;
  readonly name: string;
  readonly kind: string;
  readonly label?: string;
  readonly target?: string;
  readonly summary: string; // 「条件/操作の概要」表示用
}

export function buildFlowSequenceTable(flow: Flow): readonly FlowSequenceRow[] {
  const body = flow.body;
  if (body === undefined || body.elements.length === 0) return [];

  const ordered = orderElements(body);
  return ordered.map((el, i) => ({
    order: i + 1,
    name: el.name,
    kind: el.kind,
    label: el.label,
    target: el.target,
    summary: buildSummary(el),
  }));
}

function orderElements(body: FlowBodyInfo): readonly FlowElementInfo[] {
  const elementsByName = new Map(body.elements.map((e) => [e.name, e]));
  const edges = body.edges ?? [];

  // BFS-like traversal from startTarget through edges
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.from) ?? [];
    list.push(edge.to);
    adjacency.set(edge.from, list);
  }

  const visited = new Set<string>();
  const ordered: FlowElementInfo[] = [];

  const start = body.startTarget;
  const queue: string[] = [];
  if (start !== undefined && elementsByName.has(start)) {
    queue.push(start);
  }
  while (queue.length > 0) {
    const name = queue.shift();
    if (name === undefined) break;
    if (visited.has(name)) continue;
    visited.add(name);
    const el = elementsByName.get(name);
    if (el !== undefined) ordered.push(el);
    for (const next of adjacency.get(name) ?? []) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  // edges に乗らなかった (孤立) 要素は元の順序で末尾に追加
  for (const el of body.elements) {
    if (!visited.has(el.name)) ordered.push(el);
  }

  return ordered;
}

function buildSummary(el: FlowElementInfo): string {
  switch (el.kind) {
    case "recordLookup":
      return el.target !== undefined ? `\`${el.target}\` を取得` : "レコード取得";
    case "recordCreate":
      return el.target !== undefined ? `\`${el.target}\` を作成` : "レコード作成";
    case "recordUpdate":
      return el.target !== undefined ? `\`${el.target}\` を更新` : "レコード更新";
    case "recordDelete":
      return el.target !== undefined ? `\`${el.target}\` を削除` : "レコード削除";
    case "decision":
      return "条件分岐";
    case "loop":
      return el.target !== undefined ? `\`${el.target}\` をループ` : "ループ";
    case "assignment":
      return "変数代入";
    case "actionCall":
      return el.target !== undefined
        ? `アクション \`${el.target}\` 呼び出し`
        : "アクション呼び出し";
    case "subflow":
      return el.target !== undefined
        ? `サブフロー \`${el.target}\` 呼び出し`
        : "サブフロー呼び出し";
    case "screen":
      return "画面表示";
    case "wait":
      return "待機";
    default:
      return el.kind;
  }
}
