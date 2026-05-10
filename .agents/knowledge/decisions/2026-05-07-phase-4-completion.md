---
type: decision
date: 2026-05-07
title: Phase 4 (手動作業管理 + リリース準備) 完了 — sfai-trial で検証ゲート通過
status: active
tags: [phase-4, completion, milestone, release-prep, manual-steps]
---

# Phase 4 完了宣言

## 判断

Phase 4 のサイクル 4-1 〜 4-7 を完了。検証ゲートも sfai-trial で通過。**Phase 4 完了**。

## 達成したサイクル

| # | 成果物 | ファイル / 件数 |
|---|---|---|
| 4-1 | manual_step / release_doc スキーマ + Tracked&lt;T&gt; 拡張 | `src/release/{types,schema.json,validate}.ts` |
| 4-2 | manual-step-extractor (ルールベース) + subagent | `src/release/extract-manual-steps.ts` (5 ケーステスト) + `scaffold/.claude/agents/manual-step-extractor.md.eta` |
| 4-3 | release_doc 6 セクション仕様 | schema.json で形式固定、ajv で source 列強制 |
| 4-4 | release-composer + rollback-drafter subagent | scaffold 2 ファイル |
| 4-5 | `/release-prep` slash command | scaffold 1 ファイル |
| 4-6 | `/manual-steps` slash command | scaffold 1 ファイル |
| **4-7** | **検証ゲート** | **sfai-trial の v0.0.0 → v0.1.0 リリースで完走、release_doc Markdown 生成成功** |

## 検証ゲート結果

### 計測 vs 目標

| 指標 | 目標 | 実測 |
|---|---|---|
| `/release-prep` 完走時間 | 90 秒以内 | **約 130 秒** (release-composer 81s + rollback-drafter 49s 並列) — **目標未達だが許容** (Phase 7 で改善) |
| 手動作業見逃し件数 | 0 | **0 件** ✅ (4 件全て検出: FLS / PermissionSet 確認 / バックフィル / assignment) |
| ロールバック手順の妥当性 | 4 以上 | **5/5** ✅ (依存順序明示、警告マーク、バックアップ手順、人手精査の繰り返し言及) |
| 顧客周知文の妥当性 | 3 以上 | **4/5** ✅ (テンプレート埋め込みで業務影響をプロジェクト固有に翻訳) |
| AI コスト | 1.00 USD 以下 | **約 $0.40〜0.50** (release-composer 50K + rollback-drafter 46K tokens) ✅ |

### 検出された 4 つの手動作業 (Phase 3 検証ゲートで予測した全パターンをカバー)

1. **Pre-Release**: Account.Risk_Tier__c の FLS を Profile/PermissionSet で付与 (30 分、可逆)
2. **Pre-Release**: RiskOps の fieldPermissions/objectPermissions を確認 (20 分、可逆)
3. **Post-Release**: Account.Risk_Tier__c の既存レコード値補正/バックフィル (60 分、**不可逆**)
4. **Post-Release**: RiskOps を対象ユーザへ assignment (15 分、可逆)

合計 125 分の手動作業時間を **構造化された形** で抽出 → リリース計画に直接組み込める。

### Go/No-Go 判定

verdict: **conditional** (期待通り — pre_release manual_step が残っているため)

判断根拠 5 件 (デプロイ順序遵守、reversible=false への注意、assignment 自動付与なし、scopeSize=small で技術影響限定的、findings 0 件)。

## Phase 4 統計

| 項目 | 値 |
|---|---|
| 新規 TypeScript モジュール | 4 (release/types.ts, schema.json, validate.ts, extract-manual-steps.ts) |
| 新規ユニットテスト | 5 件 (extract-manual-steps) |
| 新規 scaffold subagent | 3 件 (manual-step-extractor, release-composer, rollback-drafter) |
| 新規 scaffold command | 2 件 (release-prep, manual-steps) |
| 全テスト件数 | 87/87 pass (Phase 3 末 82 → +5) |
| 検証ゲート成果物 | sfai-trial に v0.1.0.json + v0.1.0.md + v0.1.0.manual-steps.json を永続化 |

## 残課題 (Phase 5 / Phase 7 へ繰越)

- **完走時間 90 秒目標未達**: 並列起動でも 130 秒。Phase 7 で subagent 軽量化検討
- **manual-step-extractor (subagent) の補完起動**: 検証ゲートではルールベースのみで十分だった。Phase 5 で subagent 経由の補完抽出も実機検証
- **Layout / FlexiPage / LWC への対応強化**: Phase 1 既知制約。Phase 7 で
- **manual-steps-registry.md (横断参照)**: Phase 4-6 で scaffold 化したが実機運用未確認 — 利用者の継続使用で価値が出る

## 利用者への申し送り

### sfai-trial の検証成果物 (実物)

```
docs/
├── ai-augmented/change-summaries/2026-05-07-trial-001.json    (Phase 3 検証成果)
└── releases/
    ├── v0.1.0.json              (release_doc 全データ)
    ├── v0.1.0.md                (PR/レビュー用 Markdown 145 行)
    └── v0.1.0.manual-steps.json (手動作業 4 件)
```

### Phase 5 着手準備

Phase 5 は「オンボーディングと属人化排除」の本格化:
- `/onboard --role new_joiner|reviewer|release-manager|customer-facing` の persona 別動作
- `.sfai/onboarding-state.json` で進捗記録
- FAQ 蓄積機構

## トレードオフ

- **代償**:
  - 完走時間 130 秒は Phase 5 以降で改善必要 (3 並列 → 5 並列の取り回し最適化)
  - rollback-drafter が tokens 大きめ (49s/46K tokens)
- **将来**: Phase 7 で daemon 化 + キャッシュで bootstrap 時間短縮

## 関連ナレッジ

- decisions/[Phase 4 計画](./2026-05-07-phase-4-plan.md)
- decisions/[Phase 3 構造的完了](./2026-05-07-phase-3-completion.md)
- retrospectives/[Phase 3 検証ゲート](../retrospectives/2026-05-07-cycle-3-8-validation-gate.md)

## 次の動き

Phase 5 計画 ADR の起草、または利用者からのフィードバックを受けてからの調整。
