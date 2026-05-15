---
type: win
date: 2026-05-13
title: explain-write のマーカー整合性保全が初回実利用で機能した
tags: [v0.3.0, week-0, explain-write, marker-integrity, baseline]
---

# explain-write のマーカー整合性保全が初回実利用で機能した

## 何が効いたか

`sfai explain-write --kind apexClass --fqn MX_OpportunityTriggerHandler --input <json>` を実プロジェクトへの初回実利用で実行し、AI_MANAGED 7 ブロックを一括書き戻して `updated=7 skipped=0` でロールバックなく完走した。マーカー (`<!-- AI_MANAGED_START id="..." -->` / `<!-- AI_MANAGED_END id="..." -->`) は破壊されず、DETERMINISTIC / HUMAN_MANAGED は無傷だった。

## なぜ効いたか

- `replaceBlockContent` がマーカー数の前後比較を行う設計により、id 単位の置換が原子的に成立した
- AI 側が JSON で「id → 本文」のマップを渡し、CLI が指定 id のみを差し替える分離 (= AI に Markdown 編集権を渡さない) が機能した
- 顧客固有値 (StageName / RecordType) が `body_json` で空文字列に匿名化されており、AI の出力が再現性を持つ形になっていた

## 適用条件

- AI_MANAGED の書き戻しは **必ず** `sfai explain-write` 経由 (直接 `Edit` ツールで Markdown を編集しない)
- 同時更新ブロック数が多い (7+) ケースでも、id 単位で正しく分離されていれば安全
- 一時 JSON は **プロジェクトルート内** に置く (後述の pitfall 参照)

## 再利用方法

- 利用者プロジェクトで `/sfai-explain` を回す際の安心材料として、ロールバック保証 (`updated=N skipped=0`) を運用ログに残す
- 失敗時は `skipped > 0` のブロックを特定してマーカー破損を疑う

## 関連ナレッジ

- decisions/[HUMAN_MANAGED マージアルゴリズム](../decisions/2026-05-07-human-managed-merge-algorithm.md)
- review-result/[v0.3.0 ベースライン §9-2 (2)(3)](../../review-result/baseline.md)
