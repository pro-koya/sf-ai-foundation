// change_summary から手動作業候補を **決定的に** 抽出する
// AI 推測が必要な部分は manual-step-extractor subagent (scaffold) に委譲

import type { ChangeEntry, ChangeSummary } from "../change-summary/types.js";
import { ai, deterministic } from "../change-summary/types.js";
import type { ManualStep } from "./types.js";

interface ExtractContext {
  readonly changeSummaryId: string;
  readonly promptHash: string;
  readonly model: string;
  readonly temperature: number;
}

const DEFAULT_CONTEXT: ExtractContext = {
  changeSummaryId: "unknown",
  promptHash: "sha256:rule-based",
  model: "rule-based",
  temperature: 0,
};

/**
 * change_summary 内のすべての ChangeEntry を走査し、典型的な手動作業パターンに
 * マッチするものを ManualStep として返す。
 * AI 推測ベースの procedure/timing/businessImpact は ai() でラップする。
 */
export function extractManualSteps(
  summary: ChangeSummary,
  context: Partial<ExtractContext> = {},
): readonly ManualStep[] {
  const ctx: ExtractContext = { ...DEFAULT_CONTEXT, ...context };
  const summaryId = summary.id.value || ctx.changeSummaryId;
  const steps: ManualStep[] = [];
  let counter = 1;

  for (const cat of summary.categories) {
    for (const change of cat.changes) {
      for (const step of derivePerEntry(change, cat.type.value, summaryId, ctx, () => counter++)) {
        steps.push(step);
      }
    }
  }

  return steps;
}

function derivePerEntry(
  change: ChangeEntry,
  categoryKind: string,
  summaryId: string,
  ctx: ExtractContext,
  nextSeq: () => number,
): readonly ManualStep[] {
  const entity = change.entity.value;
  const changeKind = change.changeKind.value;
  const out: ManualStep[] = [];

  // Pattern 1: PermissionSet (added) → ユーザへの assignment 必須
  if (categoryKind === "permission" && changeKind === "added") {
    out.push(
      buildStep({
        seq: nextSeq(),
        summaryId,
        ctx,
        title: `${entity} を対象ユーザへ assignment`,
        category: "post_release",
        target: entity,
        procedure: [
          `Setup → Permission Sets → ${entity}`,
          "Manage Assignments から該当ユーザを追加",
          "業務担当者リストと突き合わせて漏れを確認",
        ],
        timing: "デプロイ完了直後 (post_release)",
        executorRole: "Salesforce Admin",
        verification: "対象ユーザがログインして該当 PermissionSet を保持していることを確認",
        estimatedDurationMin: 15,
        reversible: true,
      }),
    );
  }

  // Pattern 2: 新規 PermissionSet で業務要件未達の可能性 (fieldPermissions 未設定の検討)
  if (categoryKind === "permission" && changeKind === "added") {
    out.push(
      buildStep({
        seq: nextSeq(),
        summaryId,
        ctx,
        title: `${entity} の fieldPermissions / objectPermissions を確認`,
        category: "pre_release",
        target: entity,
        procedure: [
          "PermissionSet メタデータの fieldPermissions / objectPermissions を確認",
          "業務要件で必要なフィールド・オブジェクトに対する read/edit が含まれていることを確認",
          "不足があればデプロイ前に追記",
        ],
        timing: "デプロイ前",
        executorRole: "Salesforce Developer",
        verification: "PermissionSet XML に必要な権限が列挙されていることを目視確認",
        estimatedDurationMin: 20,
        reversible: true,
      }),
    );
  }

  // Pattern 3: 新規 CustomField (data_model added) → FLS / Layout / Validation 検討
  if (categoryKind === "data_model" && changeKind === "added" && entity.includes(".")) {
    out.push(
      buildStep({
        seq: nextSeq(),
        summaryId,
        ctx,
        title: `${entity} の Field-Level Security (FLS) を Profile / PermissionSet で付与`,
        category: "pre_release",
        target: entity,
        procedure: [
          "対象 Profile / PermissionSet に該当 Custom Field の read/edit 権限を追加",
          "Page Layout への配置を検討",
          "Validation Rule の必要性を検討",
        ],
        timing: "デプロイ前",
        executorRole: "Salesforce Developer / Admin",
        verification: "対象ユーザのレコード詳細画面で当該フィールドが見える/編集できることを確認",
        estimatedDurationMin: 30,
        reversible: true,
      }),
    );
  }

  // Pattern 4: Picklist 値追加または default 設定変更 → 既存レコードの値補正
  if (categoryKind === "data_model" && (changeKind === "added" || changeKind === "modified")) {
    const review = change.reviewPoints.value.join(" ").toLowerCase();
    if (review.includes("picklist")) {
      out.push(
        buildStep({
          seq: nextSeq(),
          summaryId,
          ctx,
          title: `${entity} の既存レコード値を補正 / バックフィル`,
          category: "post_release",
          target: entity,
          procedure: [
            "既存レコードに対して新しい picklist 値を一括設定するスクリプトを準備 (Data Loader / Apex Anonymous)",
            "対象レコード件数を SOQL で事前確認",
            "メンテ時間に一括更新を実行",
          ],
          timing: "デプロイ完了後の合意済みメンテ時間",
          executorRole: "Salesforce Admin",
          verification: "更新後にランダムサンプル 5 件で値を確認",
          estimatedDurationMin: 60,
          reversible: false,
        }),
      );
    }
  }

  // Pattern 5: Apex Trigger 削除 / events 増減 → 関連テスト + デプロイ順序
  if (categoryKind === "automation" && (changeKind === "modified" || changeKind === "removed")) {
    out.push(
      buildStep({
        seq: nextSeq(),
        summaryId,
        ctx,
        title: `${entity} に関連するテストクラスのカバレッジを再確認`,
        category: "pre_release",
        target: entity,
        procedure: [
          "関連 ApexTest クラスを sfai graph query で抽出",
          "ローカルで sf apex run test を実行しカバレッジを取得",
          "80% 以上維持を確認",
        ],
        timing: "デプロイ前",
        executorRole: "Salesforce Developer",
        verification: "テスト結果でカバレッジ 80%+ かつ全件 pass",
        estimatedDurationMin: 30,
        reversible: true,
      }),
    );
  }

  return out;
}

interface BuildStepInput {
  readonly seq: number;
  readonly summaryId: string;
  readonly ctx: ExtractContext;
  readonly title: string;
  readonly category: ManualStep["category"]["value"];
  readonly target: string;
  readonly procedure: readonly string[];
  readonly timing: string;
  readonly executorRole: string;
  readonly verification: string;
  readonly estimatedDurationMin: number;
  readonly reversible: boolean;
}

function buildStep(input: BuildStepInput): ManualStep {
  const aiMeta = {
    promptHash: input.ctx.promptHash,
    model: input.ctx.model,
    temperature: input.ctx.temperature,
  };
  return {
    id: deterministic(`ms-${input.summaryId}-${String(input.seq).padStart(3, "0")}`),
    title: ai(input.title, aiMeta),
    category: ai(input.category, aiMeta),
    relatedChange: deterministic(input.summaryId),
    target: deterministic(input.target),
    procedure: ai(input.procedure, aiMeta),
    timing: ai(input.timing, aiMeta),
    executorRole: ai(input.executorRole, aiMeta),
    verification: ai(input.verification, aiMeta),
    estimatedDurationMin: ai(input.estimatedDurationMin, aiMeta),
    reversible: ai(input.reversible, aiMeta),
    notes: { value: "", source: "human" },
  };
}
