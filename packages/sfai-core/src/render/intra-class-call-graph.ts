// Apex クラス内メソッド間呼び出し関係 Mermaid (Phase 13-A)
// buildMethodSummaryTable の intraClassCalls を Mermaid flowchart に変換する。

import type { MethodSummaryRow } from "./method-summary-table.js";

export function buildIntraClassCallGraph(rows: readonly MethodSummaryRow[]): string {
  const hasAnyCall = rows.some((r) => r.intraClassCalls.length > 0);
  if (!hasAnyCall) return "";

  const lines: string[] = ["flowchart LR"];
  // ノード定義 (visibility 付きラベル)
  for (const r of rows) {
    const id = sanitize(r.methodName);
    const tag = r.isStatic ? "static" : r.visibility;
    lines.push(`  ${id}[\"${r.methodName} (${tag})\"]`);
  }
  // エッジ
  const seen = new Set<string>();
  for (const r of rows) {
    const fromId = sanitize(r.methodName);
    for (const callee of r.intraClassCalls) {
      const toId = sanitize(callee);
      const key = `${fromId}->${toId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }
  return lines.join("\n");
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, "_");
}
