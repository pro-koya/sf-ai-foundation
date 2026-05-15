// ApprovalProcess の Mermaid 図 (Phase 9-B2)
// 申請開始 → 各 step → 最終承認 / 却下 を有向グラフとして描く。

import type { ApprovalProcess } from "../types/graph.js";

const LABEL_TRUNCATE = 60;

export function buildApprovalMermaid(ap: ApprovalProcess): string {
  const lines: string[] = ["flowchart TD"];
  const startId = "ap_start";
  const approveId = "ap_final_approved";
  const rejectId = "ap_final_rejected";

  lines.push(`  ${startId}([📨 申請])`);
  lines.push(`  ${approveId}((✅ 最終承認))`);
  lines.push(`  ${rejectId}((❌ 最終却下))`);

  if (ap.steps.length === 0) {
    lines.push(`  ${startId} --> ${approveId}`);
    return lines.join("\n");
  }

  for (let i = 0; i < ap.steps.length; i++) {
    const step = ap.steps[i];
    if (step === undefined) continue;
    const id = stepId(i);
    const label = `${i + 1}. ${truncate(step.label ?? step.name, LABEL_TRUNCATE)}`;
    lines.push(`  ${id}["${escapeLabel(label)}"]`);
  }

  // start → step1
  lines.push(`  ${startId} --> ${stepId(0)}`);

  for (let i = 0; i < ap.steps.length; i++) {
    const step = ap.steps[i];
    if (step === undefined) continue;
    const here = stepId(i);
    const next = i + 1 < ap.steps.length ? stepId(i + 1) : approveId;
    // approve path
    lines.push(`  ${here} -->|承認| ${next}`);
    // step に入らなかった場合の処理
    switch (step.ifCriteriaNotMet) {
      case "ApproveRecord":
        lines.push(`  ${here} -.->|条件不一致 → 承認| ${approveId}`);
        break;
      case "RejectRequest":
        lines.push(`  ${here} -.->|条件不一致 → 却下| ${rejectId}`);
        break;
      case "GoToNextStep":
        if (i + 1 < ap.steps.length) {
          lines.push(`  ${here} -.->|条件不一致 → 次へ| ${stepId(i + 1)}`);
        } else {
          lines.push(`  ${here} -.->|条件不一致 → 承認| ${approveId}`);
        }
        break;
      default:
        break;
    }
    // 却下経路 (どの step でも却下できる)
    lines.push(`  ${here} -->|却下| ${rejectId}`);
  }
  return lines.join("\n");
}

function stepId(i: number): string {
  return `ap_step_${i + 1}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function escapeLabel(s: string): string {
  return s.replace(/"/g, "&quot;");
}
