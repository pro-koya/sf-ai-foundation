---
type: improvement
date: 2026-05-13
title: system-index.md の AI_MANAGED summary を /onboard 初回で自動生成
status: idea
tags: [v0.3.0, observed, v0.4.0-candidate, onboard, system-index]
---

# system-index.md の AI_MANAGED summary を /onboard 初回で自動生成

## Before

`docs/generated/system-index.md` の `AI_MANAGED id="summary"` ブロックが、`yohaku init --bootstrap` 直後はテンプレート文 (「本プロジェクト全体の概要 (AI 生成、再生成で上書きされます)」) のまま残る。利用者がプロジェクト全景を `system-index.md` 経由で把握しようとしたとき、最も重要な要約が空のため初動の体験が劣化する。

## After (構想)

`/onboard` の初回起動 (= state レコードが空のとき) に、以下を自動で行う:

1. 知識グラフから top-level メタ件数・主要ドメイン (sales / finance 等) を抽出
2. `system-index` 用の `purpose` / `executive-summary` / `executive-risks` を AI 推論で生成
3. `yohaku explain-write --kind systemIndex --input <tmp.json>` で書き戻し
4. state に「summary-bootstrapped=true」を記録し、2 回目以降は実行しない (再生成は明示的なコマンドで)

## 変更内容 (案)

- `/onboard` skill (`.claude/commands/onboard.md` 想定) に Step「初回判定 → summary 自動生成」を追加
- `yohaku explain-write` の `--kind` に `systemIndex` を追加 (新 ExplainKind に該当 → v0.3.0 Out of Scope)
- もしくは既存 `/yohaku-explain` を再利用する形で `systemIndex` ターゲットを後付け

## 効果測定

- 利用者の初回オンボーディング体験で「全体像が空」状態を解消
- Week 1 ヒアリングで「プロジェクト全景の理解しやすさ」を 5 段階で測定すれば定量化可能

## スコープ判定 (重要)

**v0.3.0 Out of Scope**: 新 ExplainKind 追加は `decisions/2026-05-10-v0.3.0-internal-validation-plan.md` の Out of Scope §「AI 推論基盤の機能拡張」に該当。**v0.4.0 候補**として保留する。

Phase スコープ規律 §3.2 に従い、現 Phase 内で対処せず本 improvement に記録するのみで終える。

## 次の改善案

- v0.4.0 着手 ADR を起案する際に、本 improvement を改めて選定材料に出す
- Week 1〜4 のヒアリングで本欠如が実害として顕在化するか観察する (痛みが小さければ v1.0.0 まで持ち越す判断もあり)

## 関連ナレッジ

- decisions/[2026-05-10-v0.3.0-internal-validation-plan](../decisions/2026-05-10-v0.3.0-internal-validation-plan.md) — Out of Scope の根拠
- review-result/[v0.3.0 ベースライン §9-3 (2)](../../review-result/baseline.md)
