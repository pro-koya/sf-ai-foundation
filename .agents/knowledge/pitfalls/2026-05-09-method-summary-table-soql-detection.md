---
type: pitfall
date: 2026-05-09
title: Phase 13 method-summary-table builder がインライン SOQL `[SELECT ...]` を検出しない
status: open
tags: [phase-13, phase-15, method-summary-table, soql-detection, extractor-limit]
---

# 既知のつまずき: メソッド統合表で SOQL=0 と表示されるが、実は SOQL 1 件存在する

## 発見経緯

Phase 15 (実機検証) で `AccountBalanceService.recalculate` の AI 推論をする際、DETERMINISTIC `processing-overview-table` には:

```
| `recalculate` | ... | SOQL: 0 | DML: 1 | 分岐: 1 | ループ: 3 | ... |
```

と表示されていた。一方、ソース `force-app/main/default/classes/AccountBalanceService.cls` を確認すると:

```apex
for (AggregateResult ar : [
    SELECT Account__c acc, SUM(Total_Amount__c) total
    FROM Invoice__c
    WHERE Account__c IN :accountIds AND IsPaid__c = false
    GROUP BY Account__c
]) { ... }
```

明確に **インライン SOQL aggregate** が 1 件存在する。

## 原因 (推測)

`packages/sfai-core/src/render/method-summary-table.ts` の `walkNodes` 関数は `controlFlows[].nodes` を再帰的に走査して `kind: "soql"` を数えるが、`for` ループの **header (= イテレーション元の式)** に埋め込まれた `[SELECT ...]` 式が、controlFlow 抽出時に `soql` ノードとして登録されていない可能性。

実際、`processing-overview-table` の "外部呼出" 列には `SUM` / `ar.get` が出ている → SOQL aggregate であることは別経路で検出されている。つまり SOQL の **存在**は extractor が知っているが、メソッド統合表の「件数」としては反映されていない。

## 影響

- **AI 推論の指針**: explain-writer subagent は「DETERMINISTIC のみを材料に」と指示されているため、表が間違っていると AI が「SOQL なし」と書いてしまう恐れ
- **設計書の信頼性**: 数値が実装と合わないと利用者が「設計書が信用できない」と感じる
- **現状の回避策**: AI 推論時に「DETERMINISTIC 表 + 外部呼出列の文字列 (`SUM` / `ar.get` 等)」を併せて読み、両方からファクトを推測する。Phase 15 の AccountBalanceService の AI 文面はこの併用で書いた

## 修正方針 (Phase 16 候補)

オプション A: **apex-control-flow.ts の `for` ヘッダーパース改善**
- `for (AggregateResult ar : [SELECT ...])` のヘッダーから `[SELECT ...]` を切り出し、**追加の `soql` ノード** として子配列に入れる
- ループのヘッダー文字列にも `soql` 検出を回す

オプション B: **method-summary-table.ts の集計時に外部呼出キーワードからの推測**
- `externalCalls` に `SUM` / `COUNT` / `MAX` / `MIN` / `AVG` / `ar.get` / `Database.query` 等が含まれていれば SOQL aggregate ありと推定し、`soqlCount += 1` する
- ヒューリスティックなので「推定」と明示する

オプション A の方が正確。Phase 16 で対応推奨。

## 関連

- 発見コード: `packages/sfai-core/src/render/method-summary-table.ts`
- 影響対象: 全 Apex Class の `processing-overview-table` (Phase 13 で導入)
- 同種の懸念: Trigger の `processing-summary-table` も同じロジックを使うため同様の問題がありうる
