---
type: decision
date: 2026-05-08
title: Phase 7 完了 — 設計書レベル Markdown / Mermaid / 上層部資料 / 自動懸念検出
status: active
tags: [phase-7, completion, render, mermaid, executive, concerns]
---

# Phase 7 完了宣言

## 判断

Phase 7 (取り込み拡充 + 設計書レベル Markdown + 横断ドキュメント + AI 改善案 + 上層部資料) を完了。
**`sfai sync` 1 コマンドで 49 ファイル (system-overview / executive 含む) が常に最新状態に再生成される** 状態を達成。

## 達成内容 (Phase 7-A 以降の積み増し)

| Sub | 取り組み | アウトプット |
|---|---|---|
| 7-A+1 | Apex .cls 本体の正規表現解析 | `methods` / `soqlQueries` / `dmlOperations` / `classReferences` / `classAnnotations` / `hasTryCatch` / `hasCallout` を `ApexClass.body` に格納 |
| 7-A+2 | Flow XML 構造解析 | `recordLookups` / `recordCreates` / `recordUpdates` / `recordDeletes` / `decisions` / `assignments` / `loops` / `actionCalls` / `subflows` / `screens` / `waits` を `Flow.body` に格納 |
| 7-A+3 | Trigger 詳細解析 | Trigger にも `body` を格納し、設計書レベル Markdown のセクションを追加 |
| 7-B | RecordType 取り込み | `RecordType` エンティティを追加 (新 SQLite テーブル / 新スキーマ / 新テンプレ)。ApprovalProcess 等は同じ拡張パターンで追加可 |
| 7-C | Mermaid フロー図生成 | `buildTriggerMermaid(trigger, graph)` で Trigger 起点の `flowchart LR` を生成、`buildSystemOverviewMermaid(graph)` で全体概観 |
| 7-D | 自動懸念検出 | `concernsForApex` / `concernsForTrigger` / `concernsForFlow` を追加。HIGH/MEDIUM/INFO 3 段階のヒューリスティック判定 |
| 7-E | 上層部・承認者向け資料 | `executive/summary.md` (構築規模 + 品質指標 + トリガー配置)、`executive/risks.md` (全件懸念集約) を生成 |

## 設計書レベル Markdown の中身 (Apex 例)

```
## メソッド一覧 (N)
| 可視性 | static | 戻り値 | 名前 | 引数 | 注釈 |

## データ操作
### SOQL (N)   ← 検出した SOQL を全件、対象オブジェクトつき
### DML (N)    ← 検出した DML を verb / Database クラス両方

## 呼び出し関係
### 他クラス参照 (N)  ← 含む `new ClassName(...)` パターン

## 自動検出された懸念点 (N)  ← 7-D の出力。HIGH/MEDIUM/INFO

## 起点別 処理フロー (Mermaid)  ← 7-C の出力
```

## sfai-trial での実機検証結果

```
$ sfai sync
[sfai] graph build complete: objects=10 fields=58 flows=1 apex=20
[sfai] render complete: written=49 archived=0 warnings=0
```

| 区分 | Phase 7-A 末 | Phase 7 完了時 |
|---|---|---|
| 生成ファイル数 | 43 | **49** |
| 新規エンティティ | — | RecordType (2 件) |
| 設計書セクション | 0 | メソッド / SOQL / DML / 呼び出し / Mermaid / 自動懸念 (Apex/Trigger 全件) |
| Flow 構造可視化 | 件数のみ | 要素 / オブジェクト / サブフロー / アクション |
| 上層部資料 | なし | summary + risks の 2 種 |
| 自動懸念検出 | なし | sfai-trial で MEDIUM 4 件を即時提示 |

## CLI / API 拡張

```ts
// 新エクスポート
import {
  renderRecordTypes,
  renderExecutiveSummary,
  renderExecutiveRisks,
  renderSystemOverview,
  buildTriggerMermaid,
  buildSystemOverviewMermaid,
} from "@sf-ai-foundation/sfai-core/render";
```

## テスト件数

| 区分 | Phase 7-A 末 | Phase 7 完了時 |
|---|---|---|
| 全テスト件数 | 107/107 | **127/127 (+20)** |
| 新規テストファイル | — | apex-body / flow-body / mermaid / concerns |

## バグと修正 (Phase 7 後半に発見・解決)

| バグ | 影響 | 修正 |
|---|---|---|
| `void` を予約語フィルタで弾いていたためメソッド検出から void メソッドが漏れた | Apex メソッド一覧の欠落 | `isControlFlowKeyword` で if/else/for/... のみを排除する形に分離 |
| Eta が Mermaid 文字列を HTML エスケープしてしまい `--&gt;` `&quot;` が出力に出た | Mermaid が GitHub で描画できない | `<%~ %>` (raw) に切り替え |
| `new ClassName(...)` パターンが他クラス参照として検出されなかった | Trigger Handler パターンが call-graph に出ない | `NEW_INSTANCE_REGEX` を追加し dedupe 込みでマージ |
| 既存 `.sfai/graph.sqlite` に `body_json` カラムが無い | 古い DB を持つユーザでクラッシュ | `addColumnIfMissing` で起動時に自動 ALTER |

## Phase 7 で「何を構造的に解決したか」(利用者要望への答え)

| 要望 | 解決策 |
|---|---|
| 設計書として読めるレベルの Apex/Trigger/Flow ドキュメントが欲しい | `body` に基づく **メソッド一覧 / SOQL / DML / 呼び出し関係** を全件 Markdown 化 |
| 処理フローを画面的に見たい | Trigger 起点の Mermaid + 全体概観 Mermaid を **再生成のたびに自動更新** |
| 重要メタデータも全部 ドキュメント化したい | RecordType を Phase 7-B で追加。同じパターンで ApprovalProcess / Layout / CustomMetadataType / NamedCredential を後続追加可能 |
| 上層部・承認者向け資料が欲しい | `executive/summary.md` (KPI 的概観) + `executive/risks.md` (HIGH/MEDIUM/INFO 集約) を生成 |
| AI による改善提案が欲しい | LLM 不要の決定的ヒューリスティックで HIGH/MEDIUM/INFO 懸念を即時提示 (現実装)。LLM 連携は Phase 8 候補 |
| HUMAN_MANAGED は失われたくない | 既存 7-A 設計のまま、新セクションは **DETERMINISTIC** で囲み HUMAN_MANAGED は別ブロックを保持 |

## 残課題 (Phase 8 以降)

- ApprovalProcess / Layout / CustomMetadataType / NamedCredential / LWC / Aura の取り込み (パターン確立済み)
- Apex AST ベース解析 (動的 SOQL や条件分岐内 DML の検出)
- LLM 連携によるナラティブ生成 (purpose / executive narrative / 詳細懸念)
- 横断ドキュメント (権限マトリクス / 自動化マトリクス / ER 図) の生成
- 再現性 CI (温度 0 / プロンプトハッシュ / N-run 一致) の本格化

## 関連ナレッジ

- decisions/[Phase 7 計画](./2026-05-08-phase-7-plan.md)
- decisions/[Phase 7-A 完了](./2026-05-08-phase-7-a-completion.md)
- decisions/[HUMAN_MANAGED マージ仕様](./2026-05-07-human-managed-merge-algorithm.md)
- IMPLEMENTATION_GUIDE.md Phase 7
