---
type: win
date: 2026-05-13
title: sfai onboard context の JSON 返却 API が AI から直接消費できた
tags: [v0.3.0, week-0, onboard, json-api, agent-integration]
---

# sfai onboard context の JSON 返却 API が AI から直接消費できた

## 何が効いたか

`sfai onboard context --role new_joiner` が `{ goal, readOrder, domains, primaryAgent }` を構造化 JSON で返し、Claude Code エージェントが追加パースなしで読み順を組み立てられた。初回参加者向けオンボーディング流れが「CLI → JSON → エージェント実行計画」で一気通貫に成立。

## なぜ効いたか

- 自然文ではなく **構造化スキーマ** を返す設計のため、エージェントが decision tree を組みやすい
- `role` パラメータで人物像ごとの読み順を切り替えられ、AI が読むべきドメインを CLI 側で絞り込める
- 「AI に生データを読ませない」原則と「決定的処理は CLI 側」原則の合流点として機能している

## 適用条件

- AI エージェントが消費する CLI 出力は、原則 JSON で返す (人間向けプリンタとは別経路)
- `--role` のような切り替え軸は、利用シーンの数だけ増やしすぎない (n × n の組合せ爆発を避ける)

## 再利用方法

- 今後新設する `sfai <verb> <context-noun>` 系コマンドは、人間向け表示と AI 向け JSON を分離する
- AI 向け JSON はスキーマを `.sfai/schema/` または `decisions/` に書き残し、互換維持の対象とする

## 関連ナレッジ

- review-result/[v0.3.0 ベースライン §9-2 (4)](../../review-result/baseline.md)
- decisions/[2026-05-08-phase-5-plan](../decisions/2026-05-08-phase-5-plan.md) — onboarding 設計の出発点
