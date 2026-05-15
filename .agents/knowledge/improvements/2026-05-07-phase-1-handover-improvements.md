---
type: improvement
date: 2026-05-07
title: Phase 1 → Phase 2 引き継ぎ改善案 (リファクタ候補リスト)
status: planned
tags: [phase-1, phase-2, refactor, technical-debt]
---

# Phase 1 → Phase 2 引き継ぎ改善案

## Before (Phase 1 完了時の状態)

Phase 1 を一気通貫で完成させたため、以下の小さな技術負債を残している。
動作はするが、Phase 2 で実プロジェクト適用前に解消したい点。

## After (Phase 2 で達成したい状態)

各リファクタが完了し、コードの保守性 / 型安全性 / 検証可能性が向上している状態。

## 改善項目

### 1. `extractors.ts` の分割 (中優先度)

**現状**: 約 200 行に 8 種のエンティティ抽出器が同居。
**改善**: `src/graph/extractors/{object,field,validationRule,flow,apexClass,apexTrigger,permissionSet,profile}.ts` へ分離。
**効果**: 1 ファイル 30-60 行に縮小。Phase 7 でメタデータ型追加時の影響範囲が明確化。
**着手目安**: Phase 2 サイクル 2-1 (時間が許せば)。

### 2. `cli.ts` の SQL マッピング型安全化 (中優先度)

**現状**: `cli.ts` の `readGraphFromStore` で SQLite SELECT 結果を `KnowledgeGraph` 型へ手動マッピング。`as any` を 1 箇所使用 (events_json の JSON.parse 部分)。
**改善**: `src/graph/sqlite-reader.ts` に `KnowledgeGraphReader` クラスを抽出し、各 SELECT 文を型付きの readonly メソッドにする。
**効果**: TypeScript の strict モードで `as any` を排除、CLI 側の責務が「コマンドハンドリング」のみに純粋化。
**着手目安**: Phase 2 サイクル 2-1 または 2-7。

### 3. `cli.ts` のコマンドハンドラ分離 (低優先度)

**現状**: 約 250 行で全コマンドが同一ファイル。
**改善**: `src/cli/commands/{graph-build,graph-query,graph-schema,render,validate,metrics,version}.ts` に分離。
**効果**: コマンド追加時の影響範囲が局所化。
**着手目安**: Phase 2 サイクル 2-5 で `metrics` 実装と同時に。

### 4. `secrets-rules.yaml` の動的読み込み (高優先度)

**現状**: `DEFAULT_RULES` のみハードコード。利用者が `.yohaku/secrets-rules.yaml` を置いても読まれない。
**改善**: `js-yaml` または `yaml` パッケージで `.yohaku/secrets-rules.yaml` を動的にロードし、`DEFAULT_RULES` とマージ (利用者ルールが優先)。
**効果**: 利用者プロジェクトごとにマスキング規則をカスタマイズ可能に。
**着手目安**: Phase 2 サイクル 2-1。

### 5. ゴールデンテストの空白文字耐性 (低優先度)

**現状**: テンプレート修正で改行 / インデントが微妙に変わると即 fail する厳格テスト。
**改善**:
  - 比較前に末尾改行のみ正規化
  - 重要なのは構造とブロック内容なので、マーカー間の inner content と DETERMINISTIC ブロックの行集合を比較するヘルパーを作る
**効果**: テンプレート微修正の摩擦削減。
**着手目安**: Phase 2 サイクル 2-7 の動作確認時に必要なら対応。

### 6. CI 初回実行の検証 (緊急)

**現状**: 実環境で `npm install && npm test` が走ったことが無い。型エラー / lint エラーが残っている可能性。
**改善**: GitHub Actions の初回実行で出るエラーを `.agents/knowledge/pitfalls/` に逐一記録、即修正。
**効果**: Phase 2 着手前にビルドが緑になっていることを保証。
**着手目安**: Phase 2 サイクル 2-1 と並行。

## 効果測定 (Phase 2 完了時)

- `extractors.ts` が 1 ファイルあたり 100 行未満になっている
- `cli.ts` から `as any` がゼロになっている
- `secrets-rules.yaml` を変更すると graph build に反映される
- CI が緑のまま 1 週間維持されている

## 関連ナレッジ

- [2026-05-07: Phase 1 完了宣言](../decisions/2026-05-07-phase-1-completion.md)
- [2026-05-07: Phase 2 計画](../decisions/2026-05-07-phase-2-plan.md)
- [2026-05-07: sfdx-project.json 多パッケージ対応](../decisions/2026-05-07-sfdx-project-multi-package.md)
