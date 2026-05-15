---
type: improvement
date: 2026-05-13
title: docs/human/business-notes/ の bootstrap ガイド / scaffold を整える
status: idea
tags: [v0.3.0, observed, v0.4.0-candidate, human-managed, scaffold]
---

# docs/human/business-notes/ の bootstrap ガイド / scaffold を整える

## Before

`yohaku init --bootstrap` で `docs/generated/` は揃うが、人手記述領域 `docs/human/business-notes/` は **未作成**。`/onboard` のガイダンスは「このパスを参照する」と案内するものの、「どう作り始めるか」のガイドや scaffold コマンドがない。結果、人手層が空白のまま AI ループだけが回り、業務文脈が薄い AI 出力に固定化されるリスクがある。

## After (構想)

- `yohaku init --bootstrap` の選択肢に `--with-business-notes` を追加し、`docs/human/business-notes/README.md` と最小 3 ファイル (`stakeholders.md` / `domain-glossary.md` / `decisions-not-in-source.md`) のひな型を配置
- ひな型は **執筆ガイド** (何を書くか / 何を書かないか / AI に読ませる前提) を含む
- `/onboard` 初回で「人手領域がまだ空です。先に最小 3 ファイルを書きませんか?」と提案するフローを追加

## 変更内容 (案)

- `scaffold/docs/human/business-notes/` テンプレを追加
- `yohaku init --bootstrap` のフラグ拡張、または別コマンド `yohaku bootstrap human-notes`
- 既存 `system-index.md` の AI_MANAGED 生成と連動 (人手領域が埋まると AI 出力の質も上がる)

## 効果測定

- Week 1〜4 のヒアリングで「業務文脈の取り込みやすさ」「AI 出力に業務固有用語が正しく出てくる頻度」を観察
- 4 週後に `docs/human/business-notes/*.md` の行数を計測し、人手層蓄積スピードを可視化

## スコープ判定 (重要)

**v0.3.0 Out of Scope**: `yohaku init --bootstrap` の機能拡張 / scaffold 追加は新機能に該当し、`decisions/2026-05-10-v0.3.0-internal-validation-plan.md` §Out of Scope に抵触。**v0.4.0 候補**として保留。

ただし「執筆ガイド (Markdown 1 枚)」のみであれば人手層の文書追加であり、v0.3.0 内で受容可能。Week 1 で必要性が高いと判断されたら、最小コストで `docs/human/business-notes/README.md` の追記から着手する。

## 次の改善案

- 利用者が手書きした最初の 1 ファイルを `wins/` または `pitfalls/` に転載し、書き方の見本として蓄積する
- AI が人手領域に書きそうになる事故を防ぐため、`HUMAN_MANAGED` マーカーを徹底する

## 関連ナレッジ

- decisions/[2026-05-07-source-column-three-layer-boundary](../decisions/2026-05-07-source-column-three-layer-boundary.md) — 3 層分離の境界
- review-result/[v0.3.0 ベースライン §9-3 (3) / §9-4](../../review-result/baseline.md)
