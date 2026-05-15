// Phase 4 中核型: 手動作業 + リリース資材
// Tracked<T> を再利用して source 列を必須化

import type { Tracked } from "../change-summary/types.js";

export type ManualStepCategory = "pre_release" | "during_release" | "post_release";

export interface ManualStep {
  readonly id: Tracked<string>;
  readonly title: Tracked<string>;
  readonly category: Tracked<ManualStepCategory>;
  /** change_summary の id 参照 (deterministic) */
  readonly relatedChange: Tracked<string>;
  /** 対象 entity FQN (deterministic) */
  readonly target: Tracked<string>;
  readonly procedure: Tracked<readonly string[]>;
  readonly timing: Tracked<string>;
  readonly executorRole: Tracked<string>;
  readonly verification: Tracked<string>;
  readonly estimatedDurationMin: Tracked<number>;
  readonly reversible: Tracked<boolean>;
  /** 人手記述領域。AI 上書き禁止 */
  readonly notes: Tracked<string>;
}

export type GoNoGoVerdict = "go" | "no_go" | "conditional";

export interface ReleaseDoc {
  readonly version: Tracked<string>;
  readonly fromRef: Tracked<string>;
  readonly toRef: Tracked<string>;
  readonly createdAt: Tracked<string>;
  /** change_summary の id 参照 */
  readonly changeSummaryIds: Tracked<readonly string[]>;
  readonly targets: Tracked<readonly string[]>;
  readonly manualSteps: readonly ManualStep[];
  readonly preChecks: Tracked<readonly string[]>;
  readonly postChecks: Tracked<readonly string[]>;
  readonly goNoGo: {
    readonly verdict: Tracked<GoNoGoVerdict>;
    readonly rationale: Tracked<readonly string[]>;
  };
  readonly rollbackDraft: Tracked<readonly string[]>;
  readonly customerCommunication: Tracked<string>;
}
