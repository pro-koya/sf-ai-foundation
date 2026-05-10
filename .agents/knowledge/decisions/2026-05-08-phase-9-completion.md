---
type: decision
date: 2026-05-08
title: Phase 9 完了 — フローチャート途切れ解消 + Quick Summary + ValidationRule 自然語化
status: active
tags: [phase-9, completion, mermaid, summary, validation-rule, formula]
---

# Phase 9 完了宣言

## 判断

Phase 9 (途切れ解消 + パッと分かる要約 + 条件式自然語化) を完了。利用者の以下 2 点の指摘に対応:

1. 「フローチャートのラベルが途切れて中身が分からない」
2. 「処理概要をパッと読める形にしてほしい (人にも AI にも検索しやすい)」

加えて利用者指摘の「条件絡みのメタデータ」のうち **ValidationRule** を一周完成。ApprovalProcess / SharingRules は fixture が無いため 9.x 以降の独立サイクルに送る判断 (品質ゲート優先)。

## 達成内容

| Sub | 取り組み | アウトプット |
|---|---|---|
| 9-A1 | フローチャートのノード詳細表 | `buildMethodFlowchart` / `buildFlowFlowchart` の戻り値を `{ mermaid, details }` に拡張。Mermaid 内ラベルは 80 文字に短縮、詳細表で **完全な原文** を提示 |
| 9-A2 | 全エンティティ Quick Summary | `src/render/summary.ts` で 6 種 (Apex/Trigger/Flow/ValidationRule/RecordType/PermissionSet) のファクトベース要約を 1〜3 行で生成。テンプレ最上部に追加 |
| 9-B1 | ValidationRule formula 自然語化 | `src/render/formula.ts` に Salesforce 式の簡易 parser + AST → 日本語レンダラを実装。AND/OR/NOT/比較/関数 (ISCHANGED, ISPICKVAL, NULLVALUE, IF, etc.) をサポート |

## 中間サンプル (sfai-trial 実機)

### Mermaid + 詳細表 (`AccountBalanceService.recalculate`)

Mermaid (短いラベルで概形把握):

```
n7["for AggregateResult ar : [ SELECT Account__c acc, SUM(Total_Amoun…"]
```

直下の詳細表 (full text):

| Step | 種別 | 内容 |
|---|---|---|
| `n7` | for | `for AggregateResult ar : [ SELECT Account__c acc, SUM(Total_Amount__c) total FROM Invoice__c WHERE Account__c IN :accountIds AND IsPaid__c = false GROUP BY Account__c ]` |

### Quick Summary (Apex)

```
> **2 メソッド** / **SOQL 1 件** / **DML 1 件** を含む 通常クラス。
> 主要メソッド: `recalculate` (DML 1 / 分岐 1 / ループ 3)。
> 主な呼び出し先: `Account`。
```

### Quick Summary (Flow)

```
> **Active な AutoLaunchedFlow** (起点: `Order__c`)。
> 構成: レコード作成 1。
> 説明: 受注ステータスが「承認済」になったら出荷レコードを自動生成
```

### ValidationRule 自然語化 (`Order_CreditLimitCheck`)

原文:

```
AND(
  ISPICKVAL(Status__c, "Submitted"),
  Account__r.Credit_Limit__c > 0,
  Net_Amount__c > Account__r.Credit_Available__c
)
```

自然語:

```
以下を **全て** 満たす:
- `Status__c` の値が "Submitted" に等しい
- `Account__r.Credit_Limit__c` が 0 を超える
- `Net_Amount__c` が `Account__r.Credit_Available__c` を超える
```

ネストした AND/OR (`Claim_DiscountRequired`) も箇条書きで階層的に展開:

```
以下を **全て** 満たす:
- `Resolution_Type__c` の値が "Discount" に等しい
- 以下を **いずれか** 満たす:
    - `Discount_Amount__c` が空 / null である
    - `Discount_Amount__c` が 0 以下
```

## 統計

| 項目 | Phase 8 末 | Phase 9 完了時 |
|---|---|---|
| Test Files | 28 | **30** |
| Tests | 169 | **196 (+27)** |
| sfai-trial で生成される Markdown | 49 | 49 (file 数同じだが内容が大幅増) |
| 新規モジュール | — | `summary.ts`, `formula.ts` |
| Mermaid 詳細表 | なし | Apex 全メソッド + Flow に出る |
| Quick Summary | なし | 全 6 エンティティ種別の冒頭に出る |
| 条件式自然語化 | raw のみ | 6/6 ValidationRule で自然な日本語表記 |

## 修正したバグ (Phase 9 実装中)

| バグ | 影響 | 修正 |
|---|---|---|
| Eta テンプレで `<%= %>` を使うと Mermaid / 表セルが HTML エスケープされ `&#39;` 等が出力された | 表が読めない | 表セル安全化 (パイプ / バッククォート) を render.ts 側に集約、テンプレでは `<%~` 経由で raw 出力 |
| Eta テンプレ内の JS 式にバックティック (\`) を含めると compile エラー (template literal terminator 誤判定) | render が落ちる | 文字列処理を render.ts に移し、テンプレは値を流し込むだけに |
| 詳細表の中のパイプ `|` が table 区切りと衝突 | テーブル形が壊れる | `escapeForTableCell` で `\|` にエスケープ |

## merge 仕様への影響なし

Phase 8 で導入した「customized AI_MANAGED は保全」規則は Phase 9 でも変わらず機能。実機で `AccountBalanceService` の `purpose` ブロックが `/sfai-explain` 経由で書き換えた状態のまま、`sfai sync` を 3 回回しても保全されることを確認。

## 残課題 (Phase 9.x 以降)

- **9-B2: ApprovalProcess** — 取り込み + 申請 → 段階承認 → 結果の Mermaid フロー化 (sfai-trial に fixture を追加してから着手)
- **9-B3: SharingRules** — owner/criteria-based の条件可視化
- **9-B4: PermissionSet 権限の可視化** — フィールド/オブジェクト権限のマトリクス
- **9-C: AI_MANAGED 自動充填** — `/sfai-explain` を CI 化し全エンティティに自然語要約を回す
- **エッジ拡張**: Mermaid 詳細表の表示量が多い大規模クラスに `<details>` 折り畳み制御を提供 (現在は 1 メソッド単位で折り畳み済)

## 関連ナレッジ

- decisions/[Phase 9 計画](./2026-05-08-phase-9-plan.md)
- decisions/[Phase 8 完了](./2026-05-08-phase-8-completion.md)
- decisions/[Phase 7 完了](./2026-05-08-phase-7-completion.md)
- decisions/[HUMAN_MANAGED マージ仕様](./2026-05-07-human-managed-merge-algorithm.md)
