---
type: pitfall
date: 2026-05-13
title: sfai explain-write の --input はプロジェクトルート外を拒否する
severity: medium
tags: [v0.3.0, week-0, explain-write, skill-doc, path-validation]
---

# sfai explain-write の --input はプロジェクトルート外を拒否する

## 何が起きたか

初回実利用 (2026-05-13) で `/tmp/sfai-explain-input.json` を `--input` に渡したところ、`sfai explain-write --kind apexClass --fqn ExampleApexTriggerHandler --input /tmp/...` がパス制約エラーで失敗した。`.sfai/tmp-explain.json` 等プロジェクトルート内に置き直すと `updated=7 skipped=0` で成功した。

## 根本原因

`sfai explain-write` がセキュリティ境界としてプロジェクトルート外のパスを拒否する設計になっているが、`/sfai-explain` スキル定義 (`.claude/commands/sfai-explain.md`) の Step 4 にこの制約が明記されていなかった。AI エージェントの自然な手癖 (一時ファイルは `/tmp/`) と衝突する。

## どう気づいたか

Week 0 ベースライン計測のため `/sfai-explain apexClass ExampleApexTriggerHandler` を実行した際、Claude Code エージェントが `/tmp/` を選び、explain-write が拒否したことで顕在化。スキル定義に書かれていなかったため、回避は試行錯誤で学習する形になった。

## 回避策・修正

- `/sfai-explain` スキル定義 Step 4 の JSON 書き出し説明に「一時 JSON は **プロジェクトルート内** に置く (例: `.sfai/tmp-explain.json`)」を追記
- 推奨パスを `.sfai/tmp-explain-<fqn>.json` のような命名にし、`.gitignore` 既存パターン (`.sfai/`) で自動的に追跡対象外にする

## 再発防止

- 本セッション内でスキル定義を即修正 (タスク #3 で対処)
- 将来的に `sfai explain-write` がエラーメッセージで「推奨パス」を返すと、ドキュメント無しでも自己修復可能になる (v0.4.0 候補、`improvements/` に別途記録)

## 関連ナレッジ

- improvements/[2026-05-09-explain-writer-improvements](../improvements/2026-05-09-explain-writer-improvements.md)
- review-result/[v0.3.0 ベースライン §9-3 (1) / §10](../../review-result/baseline.md)
