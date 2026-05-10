---
type: improvement
date: 2026-05-07
title: CLI UX 改善 — コマンド統合で日常運用 1 コマンド化
status: planned
tags: [phase-2.5, ux, cli, dx]
---

# CLI UX 改善 — コマンド統合で日常運用 1 コマンド化

## Before (Phase 2 検証ゲート時点)

利用者の最初の体験で **4 コマンド** をシーケンシャルに叩く必要があった:

```bash
# 初回セットアップ
sfai init --profile minimal --project-name sfai-trial --language ja
sfai graph build
sfai render system-index
sfai render objects
```

日常運用 (force-app/ を編集した後) でも **3 コマンド**:

```bash
sfai graph build --incremental
sfai render system-index
sfai render objects
```

`sfai render` でターゲット (`system-index` / `objects`) を省略するとエラー、`--incremental` も明示が必要、`render` を 2 回叩くのが冗長、初回 `init` 後に build/render を別途叩くのを忘れがち、といった摩擦が複合していた。

利用者からの直接フィードバック: **「コマンド実行数が多い」**

## After (Phase 2.5 完了想定)

### 初回セットアップ: 1 コマンドに統合

```bash
sfai init --bootstrap --profile minimal --project-name sfai-trial --language ja
# 内部で: init → graph build → render system-index → render objects
```

### 日常運用: 1 コマンドに統合

```bash
sfai sync
# 内部で: graph build --incremental → render system-index → render objects
```

### 個別実行も維持 (デバッグ・部分再生成用)

```bash
sfai graph build [--incremental]
sfai render            # ← 引数省略で全描画 (system-index + objects)
sfai render system-index  # 個別
sfai render objects       # 個別
```

## 変更内容

### 1. `sfai init --bootstrap` フラグ追加

`packages/sfai-core/src/cli.ts` の `cmdInit` に `--bootstrap` を追加:
- init 完了後、`buildGraph` を呼ぶ (LocalSourceAdapter 経由)
- 続けて `renderSystemIndex` と `renderObjects` を呼ぶ
- 各ステップでログを出す (進行が見える)

### 2. `sfai render` 引数省略時の挙動

現状:
```typescript
if (target === undefined) { console.error("Usage: sfai render <system-index|objects>"); return 2; }
```

変更後:
```typescript
if (target === undefined) {
  // 全ターゲットを順次描画
  const r1 = renderSystemIndex(graph, outDir);
  const r2 = renderObjects(graph, outDir);
  reportRender({ written: [...r1.written, ...r2.written], archived: [...r1.archived, ...r2.archived], warnings: [...r1.warnings, ...r2.warnings] });
  return 0;
}
```

### 3. `sfai sync` 新規コマンド

`graph build --incremental --quiet` + `render`(全) を順次実行する 1 コマンド。

### 4. ヘルプの再構成

`printHelp` の Usage に「Quick start」セクションを追加し、`sfai init --bootstrap` と `sfai sync` を最上段に配置。

## 効果測定 (Phase 2.5 完了時)

- 初回セットアップが 4 コマンド → **1 コマンド** (`sfai init --bootstrap`)
- 日常運用が 3 コマンド → **1 コマンド** (`sfai sync`)
- 利用者の主観的ストレス指標が低下 (Phase 3 検証ゲートで再測定)

## トレードオフ

- `sfai init --bootstrap` は失敗時の切り分けがやや難しくなる → 各ステップの進行ログを必須化
- `sfai render` 引数省略の意味付け変更は **後方互換** (引数指定は引き続き有効、省略時のみ挙動追加) なので破壊的ではない
- `sfai sync` は新規コマンド、既存 CLI とは独立

## 次の改善案

- **対話モード**: `sfai init` をフラグなしで叩いたら readline で対話的にプロファイル選択 (Phase 6 で本格対応)
- **`sfai watch`**: force-app/ を監視して変更時に自動 sync (Phase 7)
- **`sfai status`**: 現在のグラフ状態 (オブジェクト数 / 直近 build 時刻 / hash) を表示

## 関連ナレッジ

- retrospectives/[Phase 2 検証ゲート](../retrospectives/2026-05-07-cycle-2-8-validation-gate.md)
- decisions/[Phase 2 完了宣言](../decisions/2026-05-07-phase-2-completion.md)
- decisions/[scaffold eta 変数規則](../decisions/2026-05-07-eta-variable-naming-convention.md)
