---
type: decision
date: 2026-05-07
title: Phase 2.5 (CLI UX 改善) 完了 — 4→1 コマンド統合
status: active
tags: [phase-2-5, ux, cli, completion]
---

# Phase 2.5 完了宣言

## 判断

利用者からの UX フィードバック「コマンド実行数が多い」を受けた改善 3 項目を実装、E2E 動作確認済み。Phase 2.5 完了。Phase 3 サイクル 3-1 着手可能。

## 改善内容

| 改善 | コード変更 | E2E 結果 |
|---|---|---|
| `yohaku init --bootstrap` | `cmdInit` に bootstrap フラグ。完了後 `buildAndStore` + `renderSystemIndex` + `renderObjects` を順次実行、進行ログを出力 | ✅ 1 コマンドで scaffold 17 + graph build + render 2 完了 |
| `yohaku sync` | 新規 `cmdSync` を `COMMANDS` Map に登録。デフォルト `--incremental`、`--full-rebuild` で完全再構築 | ✅ 日常運用 1 コマンドで build + render 完了 |
| `yohaku render` 引数省略 | `cmdRender` の `target === undefined` 分岐を「全描画」に変更。後方互換 (個別指定は維持) | ✅ system-index + objects を 1 コマンドで描画 |

加えて:
- ヘルプを「Quick start (recommended)」セクションを最上段に置く形に再構成
- `docs/01-getting-started/quickstart.md` を新コマンド前提に更新

## 効果

| 操作 | Before | After |
|---|---|---|
| 初回セットアップ | 4 コマンド | **1 コマンド** (`yohaku init --bootstrap`) |
| 日常運用 | 3 コマンド | **1 コマンド** (`yohaku sync`) |
| render 全描画 | 2 コマンド (`render system-index` + `render objects`) | **1 コマンド** (`yohaku render`) |

## 内部実装の整理

リファクタも併せて実施:
- `buildAndStore` を `cmdGraphBuild` から抽出した内部関数として再利用化
- `cmdSync` `cmdInit (bootstrap)` の双方が同じ実装パスで build + render を実行する
- `readGraphFromStore` / `reportRender` も再利用される

## 後方互換

- 旧コマンド (`yohaku graph build`, `yohaku render system-index`, `yohaku render objects`) は **すべて引き続き有効**
- 旧フラグ (`--incremental`, `--quiet`, `--root`) も同等動作
- 既存利用者への影響なし

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **`init --bootstrap` + `sync` + `render` 引数省略** | 採用 | 後方互換 + 直感的 + 4→1 圧縮率最大 |
| B. `yohaku run` のような汎用ラッパー | 却下 | 何が走るか不透明、デバッグ性が落ちる |
| C. interactive wizard (`yohaku init` 引数なしで対話モード) | 却下 (Phase 6 へ繰越) | 実装スコープ拡大、Phase 2.5 では非対話で十分 |
| D. `yohaku watch` で fs 監視自動同期 | 却下 (Phase 7 へ繰越) | 監視プロセスの管理が増えるため Phase 2.5 のスコープを超える |

## 検証

| 項目 | 結果 |
|---|---|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ pass |
| `npm test` | ✅ 54/54 (UX 改善は CLI レイヤなので既存テストに影響なし) |
| `npm run build` | ✅ + scaffold 同梱 |
| E2E: `yohaku init --bootstrap` | ✅ scaffold 17 + graph build (objects=1 fields=1) + render 2 |
| E2E: `yohaku sync` | ✅ build + render 連続実行 |
| E2E: `yohaku render` (引数なし) | ✅ system-index + objects 全描画 |
| E2E: `yohaku render objects` | ✅ 後方互換、個別描画 |

## 残課題 (Phase 3 / Phase 6 以降)

- **対話モード `yohaku init`**: Phase 6 で readline ベース実装
- **`yohaku watch`**: Phase 7 で fs 監視自動同期
- **`yohaku status`**: 現在のグラフ状態 (オブジェクト数 / 直近 build 時刻 / hash) — Phase 7 で
- **進行プログレスバー**: 大規模 org で `bootstrap` が長時間化する場合の UX 改善 — Phase 7 で

## 関連ナレッジ

- improvements/[CLI UX 改善 — コマンド統合](../improvements/2026-05-07-cli-ux-consolidation.md) (本 ADR で完了)
- decisions/[Phase 2 完了宣言](./2026-05-07-phase-2-completion.md)
- decisions/[Phase 3 着手計画](./2026-05-07-phase-3-plan.md)
- retrospectives/[Phase 2 検証ゲート](../retrospectives/2026-05-07-cycle-2-8-validation-gate.md)

## 次の動き

**Phase 3 サイクル 3-1 (差分検出基盤)** に進む。
