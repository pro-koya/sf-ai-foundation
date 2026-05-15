---
type: improvement
date: 2026-05-13
title: yohaku metrics に Claude Code セッションのトークン計測を統合
status: idea
tags: [v0.3.0, observed, v0.4.0-candidate, metrics, claude-code-integration]
---

# yohaku metrics に Claude Code セッションのトークン計測を統合

## Before

`yohaku metrics --period month` のトークン数が 0。CLI が直接呼ぶ API のみを計測しており、`/yohaku-explain` のような Claude Code セッション経由の AI 利用は **計上されない**。実際の AI コスト・回数を把握できず、v0.3.0 DoD #1 (週次運用ログ) や v0.4.0 以降のコスト最適化判断に必要な定量データが取れない。

## After (構想)

`yohaku metrics` が以下を統合計測する:

1. CLI 直接呼び出し (現状)
2. Claude Code セッション経由 (`/yohaku-explain` 等) — セッション ID とトークン消費を `.yohaku/metrics.sqlite` に追記
3. `yohaku metrics show --by source` で `cli` / `claude-code` の内訳表示

実装案:
- Claude Code 側の hooks (PostToolUse / Stop) で `yohaku metrics record-session --tokens N --session-id ...` を呼ぶ
- 既存 hooks `.claude/settings.json` に PostToolUse フックを 1 つ追加

## 変更内容 (案)

- `yohaku metrics record-session` サブコマンド新設
- `.claude/settings.json` の hooks に `Stop` イベントで集計呼び出し追加 (重い処理禁止、SQLite 1 行 INSERT 程度)
- スキーマ拡張: `metrics_sessions(id, source, tokens, ts, kind)` を `.yohaku/metrics.sqlite` に追加

## 効果測定

- Week 4 時点で `yohaku metrics show` の値が 0 でなくなる
- DoD #3 (AI 任せ可能比率) を裏付ける一次データになる

## スコープ判定 (重要)

**v0.3.0 Out of Scope**: 新サブコマンド + hooks 追加 + DB スキーマ変更は明確に機能拡張。`decisions/2026-05-10-v0.3.0-internal-validation-plan.md` §Out of Scope に抵触。**v0.4.0 候補**として保留。

代替: v0.3.0 期間中はトークン数を **手動で記録** する (週次ヒアリング項目に追加)。利用者負担は小さく、計測フォーマットの設計検証にもなる。

## 次の改善案

- Anthropic SDK のレスポンス `usage.input_tokens` / `usage.output_tokens` を hooks で拾える経路があるか確認
- Claude Code セッション ID と yohaku サイクル ID の紐付け設計を v0.4.0 ADR に含める

## 関連ナレッジ

- decisions/[2026-05-10-v0.3.0-internal-validation-plan](../decisions/2026-05-10-v0.3.0-internal-validation-plan.md) — DoD #1 計測方法
- review-result/[v0.3.0 ベースライン §9-3 (5)](../../review-result/baseline.md)
