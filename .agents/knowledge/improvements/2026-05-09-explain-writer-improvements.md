---
type: improvement
date: 2026-05-09
title: Phase 15 検証で見えた `/sfai-explain` の改善点 4 件
status: backlog
tags: [phase-15, sfai-explain, improvements, ux]
---

# 改善案: explain-writer / explain-write のさらなる磨き込み

Phase 15 の実機検証 (5 エンティティ × 21 ブロック) で実用してみて見えた改善余地を記録する。

## 改善 1: AI 推論時にソースコードを参照可能にするオプション

**現状**: explain-writer subagent 指針は「DETERMINISTIC ブロックのみを材料にする」と限定している (再生成性のため)。

**問題**: Phase 13 method-summary-table の SOQL 検出漏れのように、DETERMINISTIC が完全でないケースで AI が間違った文を書くリスクがある (Phase 15 では併読でカバーしたが、AI が常にそう動く保証はない)。

**改善案**: `--allow-source` のようなオプトインフラグを subagent 指針に加え、DETERMINISTIC が不完全な場合に限り `force-app/<source>` を参照できるようにする。ただしソースを読んだ場合は文末に `(source: <path>)` を付与し、再生成性が落ちることを明示する。

## 改善 2: explain-write の dry-run モード

**現状**: `sfai explain-write --kind X --fqn Y --input Z.json` は即座に Markdown を更新する。

**問題**: AI が生成した内容を一度確認してから書き戻したい (= 人間レビュー前提) ケースで、書き込み前に diff を見る経路がない。

**改善案**: `--dry-run` フラグを追加し、書き戻し前に「変更前 / 変更後」の diff を stdout に出力するだけにする。Phase 14 までの安全性 (registry / マーカー保全) を活かしつつ、AI 出力のレビューループを回せる。

## 改善 3: subagent 指針への「具体例」追加

**現状**: 各ブロック ID の書き方は「2〜3 段落」「業務シナリオの具体例」と抽象的。

**問題**: AI がブロックごとの粒度を揃えにくく、結果として「narrative が短く、operational-notes が長い」のような不均衡が出やすい。

**改善案**: explain-writer subagent prompt に **完成形の文例** を 2〜3 件埋め込む。例えば `narrative` は 200〜400 字、`processing-details-narrative` はメソッドあたり 80〜150 字、のような目安と、模範回答を 1 つずつ。

## 改善 4: kind 自動判定オプション

**現状**: ユーザーが `--kind apexClass --fqn AccountBalanceService` のように毎回指定する必要がある。

**改善案**: `--auto-kind` フラグまたはデフォルト挙動として、`--fqn` だけ与えれば `sfai graph query` で kind を自動判定する経路を追加。例: `AccountBalanceService` → apex_classes に存在 → `apexClass` として処理。

## 関連

- pitfalls/[2026-05-09-method-summary-table-soql-detection.md] (改善 1 の動機)
- decisions/[Phase 14 完了] (基盤の正本)
- decisions/[Phase 15 完了] (本検証)
