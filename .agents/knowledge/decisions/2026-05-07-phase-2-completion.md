---
type: decision
date: 2026-05-07
title: Phase 2 完了宣言 (Claude Code 統合 + 検証ゲート通過)
status: active
tags: [phase-2, completion, milestone, validation-gate]
---

# Phase 2 完了宣言

## 判断

Phase 2 (Claude Code 統合 + 検証ゲート) のすべてのゴール条件を達成、検証ゲートも通過した。**Phase 2 完了** を宣言する。

ただし利用者からのフィードバックで **UX (コマンド実行数の多さ)** が課題として挙がったため、Phase 3 着手前に **UX 改善サブサイクル** を実施する。

## Phase 2 ゴール条件 vs 実装結果

IMPLEMENTATION_GUIDE.md の Phase 2 完了条件:

| 完了条件 | 状態 | 備考 |
|---|---|---|
| `CLAUDE.md` が 15KB 以内で整備 | ✅ | scaffold/CLAUDE.md.eta は 4.5KB |
| `/onboard` が動作 | ✅ | 検証ゲートで実機確認 |
| `/impact <object>` が動作 | ✅ | sample-project / Dev Edition 双方 |
| subagent 3 種が動作 | ✅ | graph-querier, object-documenter, onboarding-guide |
| hooks 最小セットが動作 | ✅ | Wall-clock 2 秒目標で運用 (Node cold-start 600ms 込み) |
| 入力ソース層 IF + LocalSourceAdapter | ✅ | sfdx-project.json packageDirectories 対応含む |
| `sfai metrics` でトークン / コスト確認 | ✅ | record / show 別コマンド、period 別集計 |
| 既存 Salesforce サンプルで動作確認 | ✅ | examples/sample-project + Dev Edition |
| **検証ゲート: 1 名が `/onboard` 完走** | ✅ | **利用者の Dev Edition で `/explain` `/onboard` 動作確認** |
| `.agents/knowledge/` の運用本格開始 | ✅ | decisions 17 / pitfalls 4 / wins 1 / improvements 1 / retrospectives 8 |

## 検証ゲートで顕在化したバグ (修正済 2 件)

実環境検証によってのみ検出可能だった 2 件のバグを発見・即修正:

1. **symlink isDirectInvoke バグ (CRITICAL)**: `npm link` 経由で `sfai` が silent exit。`fs.realpathSync` で symlink resolve して比較する形に修正
2. **FK 制約バグ (HIGH)**: 標準オブジェクトに Custom Field を追加した DX 典型パターンで `FOREIGN KEY constraint failed`。`ensureReferencedObjectStubs` で親 object stub を自動生成

これらは **smoke / unit テストでは検出できなかった**バグであり、検証ゲートの設計判断が正しかったことを実証。

## 利用者からのフィードバック

- ✅ `sfai init` `graph build` `render` `/onboard` `/explain` すべて期待通り動作
- ⚠️ **UX 課題**: コマンド実行数が多い (4 コマンド連発: init / graph build / render system-index / render objects)
  - → 別途 [improvements/2026-05-07-cli-ux-consolidation.md](../improvements/2026-05-07-cli-ux-consolidation.md) として記録、Phase 3 着手前に UX サブサイクルで対応

## Phase 2 統計

| 項目 | 値 |
|---|---|
| サイクル数 | 8 (2-1〜2-8) |
| 新規 TypeScript モジュール (sfai-core) | 約 50 ファイル (合計約 4,500 行) |
| ユニットテスト | 54 件 (Phase 1 末から +7) |
| ゴールデンテスト | 6 ケース (HUMAN_MANAGED マージ) |
| ADR 新規 (Phase 2 中) | 6 件 |
| pitfalls 新規 | 4 件 |
| wins 新規 | 1 件 (E2E スモークパターン) |
| improvements 新規 | 1 件 (Phase 1 引き継ぎ) |
| retrospectives 新規 | 5 件 |

## 残課題 (Phase 3 / 7 へ繰越)

- **Fine-grained 増分ビルド**: 現状 `--incremental` でも全件書き戻し → Phase 7
- **Permission Set / Profile 詳細権限**: 現状 label / license のみ → Phase 7
- **Windows パス区切り対応**: macOS / Linux 前提 → Phase 7
- **`.forceignore` 対応**: 未対応 → Phase 7
- **AI コスト自動記録 (subagent → `sfai metrics record`)**: 標準フックなし → Phase 3 / 5 で組み込み
- **CLI UX 改善**: コマンド統合 → **次サイクル (Phase 2.5 UX) で即対応**

## 関連ナレッジ

- [Phase 2 着手計画](./2026-05-07-phase-2-plan.md)
- [Phase 1 完了宣言](./2026-05-07-phase-1-completion.md)
- [サイクル 2-1 完了](./2026-05-07-cycle-2-1-completion.md)
- pitfalls/[symlink isDirectInvoke バグ](../pitfalls/2026-05-07-symlink-isDirectInvoke-bug.md)
- pitfalls/[FK 制約バグ](../pitfalls/2026-05-07-foreign-key-standard-object-fields.md)

## 次の動き

1. **UX 改善サブサイクル (Phase 2.5)** — コマンド統合 (`sfai init --bootstrap` / `sfai sync` / `sfai render` 引数省略) を実装
2. **Phase 3 計画 ADR** — 差分意味づけと自動化の 8 サイクル分割
3. **Phase 3 実装** — ユーザ承認後に着手

Phase 2 を閉じ、UX サブサイクルを経て Phase 3 に進む。
