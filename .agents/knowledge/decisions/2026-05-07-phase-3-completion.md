---
type: decision
date: 2026-05-07
title: Phase 3 (差分意味づけと自動化) 構造的完了 — 検証ゲート (3-8) は利用者検証へ
status: active
tags: [phase-3, completion, milestone, diff, classify, sarif, consistency]
---

# Phase 3 構造的完了

## 判断

Phase 3 のサイクル 3-1 〜 3-7 を完成。検証ゲート (3-8) は利用者の現役 PR 環境での実行が必要なため保留。本サイクル群で **再現性ガバナンス層 1〜5 がコード上で動く骨格** が出揃った。

## 達成したサイクル

| # | 成果物 | 主要ファイル |
|---|---|---|
| 3-1 | `yohaku diff` CLI (差分検出基盤) | `src/diff/{types,git,classify-files,diff,index}.ts`, テスト 11 件 |
| 3-2 | change_summary スキーマ + Tracked&lt;T&gt; + ajv 強制 | `src/change-summary/{types,schema.json,validate,index}.ts`, テスト 7 件 |
| 3-3 | 5 並列分類 subagent ひな型 | `scaffold/.claude/agents/{data-model,automation,permission,ui,logic}-classifier.md.eta` |
| 3-4 | `/classify-diff` slash command | `scaffold/.claude/commands/classify-diff.md.eta` |
| 3-5 | 一致率 CI 基盤 | `src/consistency/{types,check,index}.ts`, テスト 7 件、ゴールデン入出力 1 件 |
| 3-6 | Code Analyzer SARIF 取り込み | `src/sarif/{types,parse,index}.ts`, `yohaku diff --include-static-analysis`, テスト 3 件 |
| 3-7 | `/change-summary` slash command | `scaffold/.claude/commands/change-summary.md.eta` |
| **3-8** | **検証ゲート** | **利用者検証で実施 (Dev Edition + 実 PR)** |

## 再現性ガバナンスの実装状況

| 層 | 内容 | 状態 |
|---|---|---|
| 1. プロンプトをコードとして扱う | `scaffold/.claude/agents/*.md.eta` を Git 管理、SHA-256 ハッシュ計算 | ✅ ハッシュ計算は `sha256` ヘルパー再利用 |
| 2. source 列必須化 | `Tracked<T>` + `change-summary/schema.json` で ajv 強制 | ✅ 完全実装 |
| 3. ゴールデンテスト | `tests/golden/ai/classify-diff/` に入出力ペア 1 件 | ⚠ 1 件のみ。Phase 5 で 3 件以上に拡充 |
| 4. AI 出力一致率 CI | `runConsistencyCheck` + `expectMatchRate`、80% 強制 | ✅ 枠組み完成、実 AI 統合は Phase 5 |
| 5. 決定的 vs AI 境界 | 各分類器の system prompt に明記、Tracked&lt;T&gt; ヘルパー | ✅ 完全実装 |

## 実装統計 (Phase 3 中)

| 項目 | 値 |
|---|---|
| 新規 TypeScript モジュール | 約 14 個 (`diff/`, `change-summary/`, `consistency/`, `sarif/`) |
| 新規ユニットテスト | 28 件 (11 + 7 + 7 + 3) |
| 新規ゴールデンケース | 1 件 (classify-diff/case-1-account-field) |
| 新規 scaffold ファイル | 6 件 (5 classifier + 1 command) |
| 全テスト件数 | 82/82 pass |

## 検証ゲート (3-8) の実行方針

利用者が以下の条件で実施:

1. Dev Edition 上の `yohaku-trial` で 2〜3 ファイルの差分を作成 (例: 既存 Account に新 Custom Field 追加 + Apex 修正)
2. `git commit && yohaku diff --from main --to HEAD --json --path-prefix force-app/`
3. Claude Code から `/classify-diff` を起動
4. 分類結果を人手照合し、以下を計測:
   - 完走時間 (60 秒以内目標)
   - 分類精度 (人手照合での一致率、80% 以上目標)
   - 手動作業見逃し件数 (0 件目標)
   - AI コスト (typical PR で 0.50 USD 以下)
5. 結果を `.agents/knowledge/retrospectives/<date>-cycle-3-8-validation-gate.md` に記録

## 残課題 (Phase 4 / Phase 7 へ繰越)

- **実 AI 統合 (Phase 5)**: `runConsistencyCheck` の producer に実 Claude API 呼び出しを差し込む
- **ApexGuru 連携 (Phase 4)**: logic-classifier から DX MCP scale-products toolset を呼び出す
- **大規模 PR の最適化 (Phase 7)**: 1000 ファイル超のサンプリング戦略を refine
- **`.github/PULL_REQUEST_TEMPLATE.md` 統合 (Phase 6)**: change-summary を PR テンプレートから参照

## トレードオフ

- **代償**:
  - 一致率 CI は枠組みのみで実 AI 統合は Phase 5 へ繰り越し → 完全な再現性検証は次 Phase
  - ゴールデンケース 1 件のみ → 多様な差分パターンの検証は Phase 5 で
- **将来課題**: 一致率 80% を 95% に引き上げる時期 (Phase 7)

## 関連ナレッジ

- decisions/[Phase 3 着手計画](./2026-05-07-phase-3-plan.md)
- decisions/[source 列必須化](./2026-05-07-source-column-three-layer-boundary.md)
- decisions/[Code Analyzer SARIF 統合](./2026-05-07-code-analyzer-sarif-integration.md)
- decisions/[Phase 2.5 完了](./2026-05-07-phase-2-5-completion.md)

## 次の動き

1. **検証ゲート (3-8)**: 利用者が Dev Edition 環境で 1 PR を `/classify-diff` で意味づけし、retrospective を残す
2. **Phase 4 計画 ADR**: 検証ゲート結果を踏まえ、手動作業管理とリリース準備の 8 サイクル分割

Phase 3 を構造的完了として閉じ、利用者検証 → Phase 4 へ進む。
