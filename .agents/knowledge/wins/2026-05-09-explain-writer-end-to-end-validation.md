---
type: win
date: 2026-05-09
title: `/yohaku-explain` の AI 推論 end-to-end が本物の AI 推論で通った
tags: [phase-15, yohaku-explain, end-to-end, validation]
---

# 効いたパターン: explain-writer subagent 指針に従った AI 推論で 5 エンティティを設計書化

## 何が効いたか

Phase 14 で **書き戻し基盤 + Block ID Registry + scaffold subagent 指針** を整備していたおかげで、Phase 15 で claude-code セッション内の私 (= AI) が explain-writer の役割を担って実際に文面を生成し、`yohaku explain-write` で書き戻すフローが **コード変更ゼロで** 通った。

## 実機検証結果 (5 エンティティ × 21 ブロック)

| Kind | FQN | 書き込んだ ID 数 | 結果 |
|---|---|---|---|
| apexClass | `ClaimDashboardController` | 5 | `updated=5 skipped=0` ✓ |
| apexClass | `AccountBalanceService` | 5 | `updated=5 skipped=0` ✓ |
| apexTrigger | `OrderTrigger` | 4 | `updated=4 skipped=0` ✓ |
| object | `Invoice__c` | 3 | `updated=3 skipped=0` ✓ |
| flow | `Order_AutoCreateShipmentOnApproval` | 4 | `updated=4 skipped=0` ✓ |

合計 **21 ブロック書き込み完了**、全件 `yohaku sync` 再実行後も保全。

## なぜ通ったか (再利用したいパターン)

### 1. subagent 指針が AI に十分な制約を与える

`scaffold/.claude/agents/explain-writer.md.eta` の各ブロック ID 別書き方ガイド (purpose / narrative / business-scenario / operational-notes / business-domain / key-design-decisions / processing-overview-narrative / processing-details-narrative) のおかげで、AI が「どのブロックに何を書くか」で迷わない。

### 2. registry がブロック ID の正書法を担保

`block-registry.ts` のホワイトリストにより、`narratve` (typo) 等を渡した場合は早期エラーで止まる。AI 出力の品質に関係なく、**書き戻しの安全性が担保** される。

### 3. DETERMINISTIC + 外部呼出列の併読パターン

Apex の場合、`processing-overview-table` の数値列 (SOQL/DML/分岐/ループ) と「外部呼出」列の文字列 (`SUM`, `ar.get`, `Database.update` 等) を **併読** することで、メソッドが何をしているかをかなり正確に推測できる。

例: `AccountBalanceService.recalculate` で SOQL=0 と表示されていても、外部呼出に `SUM` `ar.get` があれば「SOQL aggregate を使っている」と推測できる。これは subagent 指針に「(推測) を明示する」ルールがあるおかげで、AI が断言せず安全に書ける。

### 4. ER 図と隣接オブジェクト関係の活用

`object` 種別の AI 推論では、`system-overview.md` の ER 図 (Phase 12-B4) を読むことで隣接オブジェクト (Master-Detail / Lookup の方向) を正確に把握できた。`Invoice__c` の `business-domain` ブロックで上流 (`Account`) / 下流 (`Invoice_Line__c`) を書く際に有効。

## 再利用すべき場面

- 実プロジェクト (路線 A) 適用時の `/yohaku-explain` 実行
- 新エンティティ種別を追加した直後の動作確認
- subagent 指針を改修したときの回帰検証

## 学び

実装側 (CLI / registry / subagent prompt) を整備しておけば、AI 推論部分は **claude-code セッション = 一般的な Claude モデル** で十分に成立する。専用 LLM パイプラインは不要。
