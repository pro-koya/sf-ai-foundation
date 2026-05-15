// Trigger 処理サマリ表 builder (Phase 13-C)
// Trigger は通常 1 メソッド (= execute) 相当なので、controlFlows を統合して 1 行にまとめる。

import type { ApexBodyInfo, ApexControlFlowNode, ApexTrigger } from "../types/graph.js";

export interface TriggerProcessingSummary {
  readonly events: readonly string[];
  readonly soqlCount: number;
  readonly dmlCount: number;
  readonly branchCount: number;
  readonly loopCount: number;
  readonly tryCount: number;
  readonly delegations: readonly string[]; // 委譲先 (handler クラス等)
}

export function buildTriggerProcessingSummary(trigger: ApexTrigger): TriggerProcessingSummary {
  const body = trigger.body;
  const stats = body !== undefined ? aggregateBody(body) : zero();
  return {
    events: trigger.events,
    soqlCount: stats.soql,
    dmlCount: stats.dml,
    branchCount: stats.branch,
    loopCount: stats.loop,
    tryCount: stats.tryBlocks,
    delegations: collectDelegations(body),
  };
}

interface NodeStats {
  soql: number;
  dml: number;
  branch: number;
  loop: number;
  tryBlocks: number;
}

function zero(): NodeStats {
  return { soql: 0, dml: 0, branch: 0, loop: 0, tryBlocks: 0 };
}

function aggregateBody(body: ApexBodyInfo): NodeStats {
  // controlFlows があれば優先、なければ body 直の集計
  const flows = body.controlFlows ?? [];
  if (flows.length === 0) {
    return {
      soql: body.soqlQueries.length,
      dml: body.dmlOperations.length,
      branch: 0,
      loop: 0,
      tryBlocks: body.hasTryCatch ? 1 : 0,
    };
  }
  const total = zero();
  for (const f of flows) {
    const s = walkNodes(f.nodes);
    total.soql += s.soql;
    total.dml += s.dml;
    total.branch += s.branch;
    total.loop += s.loop;
    total.tryBlocks += s.tryBlocks;
  }
  return total;
}

function walkNodes(nodes: readonly ApexControlFlowNode[]): NodeStats {
  const stats = zero();
  for (const n of nodes) {
    switch (n.kind) {
      case "soql":
        stats.soql += 1;
        break;
      case "dml":
        stats.dml += 1;
        break;
      case "if": {
        stats.branch += 1;
        addInPlace(stats, walkNodes(n.thenNodes));
        addInPlace(stats, walkNodes(n.elseNodes));
        break;
      }
      case "for":
      case "while": {
        stats.loop += 1;
        addInPlace(stats, walkNodes(n.body));
        break;
      }
      case "try": {
        stats.tryBlocks += 1;
        addInPlace(stats, walkNodes(n.tryNodes));
        for (const c of n.catches) addInPlace(stats, walkNodes(c.nodes));
        addInPlace(stats, walkNodes(n.finallyNodes));
        break;
      }
      default:
        break;
    }
  }
  return stats;
}

function addInPlace(target: NodeStats, src: NodeStats): void {
  target.soql += src.soql;
  target.dml += src.dml;
  target.branch += src.branch;
  target.loop += src.loop;
  target.tryBlocks += src.tryBlocks;
}

function collectDelegations(body: ApexBodyInfo | undefined): readonly string[] {
  if (body === undefined) return [];
  const out: string[] = [];
  for (const ref of body.classReferences) {
    out.push(ref.className);
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}
