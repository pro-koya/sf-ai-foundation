// 決定的懸念検出 (Phase 7-D)
// 既存の知識グラフから抽出可能な「気になる点」を heuristics で生成する。
// LLM は使わない。誤検出は HUMAN_MANAGED で抑止できる前提。

import type { ApexClass, ApexTrigger, Flow, KnowledgeGraph } from "../types/graph.js";

export type ConcernSeverity = "HIGH" | "MEDIUM" | "INFO";

export interface Concern {
  readonly severity: ConcernSeverity;
  readonly title: string;
  readonly detail?: string;
}

const APEX_LARGE_LINES_THRESHOLD = 500;

export function concernsForApex(cls: ApexClass, graph: KnowledgeGraph): readonly Concern[] {
  const out: Concern[] = [];

  if (!cls.isTest && (cls.linesOfCode ?? 0) > APEX_LARGE_LINES_THRESHOLD) {
    out.push({
      severity: "MEDIUM",
      title: `クラスが ${cls.linesOfCode} 行と大きい (>${APEX_LARGE_LINES_THRESHOLD})`,
      detail: "責務分割を検討。ハンドラ / サービス / リポジトリへの抽出余地あり。",
    });
  }

  if (cls.body?.hasCallout && !cls.body.hasTryCatch) {
    out.push({
      severity: "HIGH",
      title: "HTTP コールアウトに try/catch が見つからない",
      detail: "Calloutexception を握り潰さず明示的に処理することを推奨。",
    });
  }

  if (!cls.isTest && !hasMatchingTestClass(cls, graph)) {
    out.push({
      severity: "MEDIUM",
      title: "対応するテストクラスが見つからない",
      detail: `\`${cls.fullyQualifiedName}Test\` 等の命名で存在するか確認。`,
    });
  }

  if (cls.body !== undefined) {
    const dmlInLoop = cls.body.dmlOperations.length;
    if (dmlInLoop >= 5) {
      out.push({
        severity: "MEDIUM",
        title: `DML 検出数が ${dmlInLoop} 件と多い`,
        detail: "Bulk 実行とガバナ制限への抵触可能性を要レビュー。",
      });
    }
  }

  return out;
}

function hasMatchingTestClass(cls: ApexClass, graph: KnowledgeGraph): boolean {
  const want = `${cls.fullyQualifiedName}Test`;
  return graph.apexClasses.some((c) => c.fullyQualifiedName === want && c.isTest);
}

export function concernsForTrigger(trg: ApexTrigger, graph: KnowledgeGraph): readonly Concern[] {
  const out: Concern[] = [];
  const sameObject = graph.apexTriggers.filter((t) => t.object === trg.object);
  if (sameObject.length > 1) {
    out.push({
      severity: "HIGH",
      title: `${trg.object} に複数のトリガー (${sameObject.length} 本)`,
      detail: "1 オブジェクト 1 トリガー + ハンドラパターンへの集約を推奨。",
    });
  }

  if (trg.body !== undefined && trg.body.classReferences.length === 0 && (trg.body.methods.length === 0)) {
    out.push({
      severity: "MEDIUM",
      title: "トリガー本体にクラス委譲が見られない",
      detail: "ロジックを Apex クラス (Handler / Service) に切り出すと保守性が向上。",
    });
  }

  return out;
}

export function concernsForFlow(flow: Flow): readonly Concern[] {
  const out: Concern[] = [];
  if (flow.description === undefined || flow.description.trim() === "") {
    out.push({
      severity: "INFO",
      title: "Flow に description が未設定",
      detail: "運用引き継ぎ時の理解コスト低減のため、目的の一文を入れることを推奨。",
    });
  }
  if (flow.body !== undefined && flow.body.elements.length === 0) {
    out.push({
      severity: "INFO",
      title: "Flow から要素を検出できなかった",
      detail: "XML 構造の限界か、空の Flow の可能性。再確認推奨。",
    });
  }
  return out;
}
