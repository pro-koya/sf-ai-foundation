---
type: decision
date: 2026-05-09
title: Phase 13 完了 — 処理概要・処理詳細セクション + Markdown 表崩れ修正
status: completed
tags: [phase-13, completion, processing-overview, processing-details, narrative, markdown-rendering]
---

# Phase 13 完了

## 結果サマリ

| 指標 | 完了前 | 完了後 |
|---|---|---|
| Apex / Flow / Trigger の DETERMINISTIC 処理可視化セクション | 既存 (Mermaid + 件数) | + **処理概要表 / クラス内呼出 Mermaid / Flow 実行シーケンス表 / Trigger 統合サマリ表** |
| Apex の AI_MANAGED ブロック | 5 (purpose/concerns/narrative/business-scenario/key-design-decisions) | **7** (+ processing-overview-narrative / processing-details-narrative) |
| Flow の AI_MANAGED ブロック | 4 | **6** (+ processing-overview-narrative / processing-details-narrative) |
| Trigger の AI_MANAGED ブロック | 4 | **6** (+ processing-overview-narrative / processing-details-narrative) |
| ユニットテスト件数 | 235 | **246** (+11: method-summary 4, intra-class-call 1 統合, flow-sequence 3, trigger-summary 2, eta-engine post-process 2) |
| Markdown 表崩れ | 表行間に空行が残り GitHub で表が崩壊 | **修正済**: `postProcessMarkdown` で表行直後の空行を局所削除 |
| `sfai sync` warnings | 0 | **0** (維持) |
| Phase 8/11/12 の AI_MANAGED 出力 | OK | **OK** (`purpose` 等の既存内容を回帰なく保全) |

## 実装内容

### 13-A: Apex 処理可視化強化

#### 新規 builder

- **`buildMethodSummaryTable(cls)`** — controlFlows を再帰集計し、各メソッドの SOQL/DML/分岐/ループ/try/呼び出し先を統合表データとして返す
  - `MethodSummaryRow` には `intraClassCalls` (自クラス内呼び出し) と `externalCalls` (外部呼び出し) を区別して保持
  - 自クラス内呼び出しの判定: `controlFlows` の `stmt`/`if`/`for`/`while`/`return`/`throw` 各ノードの式テキストから `(\w+)\s*\(` 正規表現でメソッド呼び出し候補を抽出し、自クラスの `methods[].name` と突き合わせ
  - 予約語 (`if`, `for`, `while`, `return`, `throw`, `new`, `do`, `switch`, `catch`) は除外して false positive を防ぐ
- **`buildIntraClassCallGraph(rows)`** — 上記の `intraClassCalls` を Mermaid `flowchart LR` に変換 (呼び出し無しなら空文字)

#### Apex テンプレート追加セクション

- `processing-overview-table` (DETERMINISTIC) — 全メソッドの 1 表化
- `intra-class-call-graph` (DETERMINISTIC) — クラス内メソッド呼び出し Mermaid
- `processing-overview-narrative` (AI_MANAGED) — クラス全体の処理流れの自然言語
- `processing-details-narrative` (AI_MANAGED) — メソッドごとの処理説明

### 13-B: Flow 処理可視化強化

#### 新規 builder

- **`buildFlowSequenceTable(flow)`** — `body.elements` を `body.edges` に従って実行順 (BFS) に並べ、各要素を「順番付き行」に変換
  - `startTarget` から始め、`edges` で辿れる要素を順序付け
  - `edges` に乗らない孤立要素は元順序で末尾に追加
  - 要素種別ごとに `summary` 列を生成 (`recordLookup` → ``\`Object\` を取得`` 等)

#### Flow テンプレート追加セクション

- `processing-sequence-table` (DETERMINISTIC) — 実行シーケンス表
- `processing-overview-narrative` (AI_MANAGED)
- `processing-details-narrative` (AI_MANAGED)

### 13-C: Trigger 処理可視化強化

#### 新規 builder

- **`buildTriggerProcessingSummary(trigger)`** — Trigger body の `controlFlows` を統合し、SOQL/DML/分岐/ループ/try/委譲先を 1 オブジェクトに集計

#### Trigger テンプレート追加セクション

- `processing-summary-table` (DETERMINISTIC) — Trigger 統合サマリ 1 行
- `processing-overview-narrative` (AI_MANAGED)
- `processing-details-narrative` (AI_MANAGED)

### Markdown 表崩れ修正 (利用者からの追加要望)

#### 問題

`InvoicePdfController.md` 等で、テンプレートの `<% items.forEach() %>` ループが、各表行の前後に空行を生み、結果として:

```
| 可視性 | ... |
|---|---|
                    ← 空行
| private | ... |
                    ← 空行
| public | ... |
```

GitHub の Markdown レンダラでは、ヘッダ区切り行とデータ行の間に空行があると **表として認識されず文字列扱い** されるため、表が崩壊。

#### 試行錯誤と最終解

| アプローチ | 結果 |
|---|---|
| `autoTrim: ["nl", "nl"]` (両側で改行除去) | 箇条書きが 1 行に潰れる ❌ |
| `autoTrim: [false, "nl"]` (`%>` 後ろのみ除去) | Mermaid 閉じフェンス glue / インライン `<% if %>` 後ろの改行も削れて bullets が連結 ❌ |
| `autoTrim: false` + `postProcessMarkdown` 後処理 | **採用** ✓ |

`renderEta` 出力に対して以下のローカル後処理を適用 (`packages/sfai-core/src/render/eta-engine.ts`):

```typescript
function postProcessMarkdown(text: string): string {
  // 表行 `| ... |` の直後に空行が挟まり次の表行が来るパターン → 空行を全削除
  let out = text;
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(/(\|[^\n]*\|)\n(?:[ \t]*\n)+(\|[^\n]*\|)/g, "$1\n$2");
  }
  // 装飾用: 4 連続以上の \n は 3 個に圧縮 (Markdown の意味は変わらない)
  out = out.replace(/\n{4,}/g, "\n\n\n");
  return out;
}
```

利点:
- テンプレート側を一切触らない (golden test / 既存挙動への影響ゼロ)
- 表行が連続しているケースだけを正確に検出 → false positive なし
- Mermaid / 段落 / 見出し / 箇条書きの空行は完全に維持

### 共通基盤の調整

- `render/method-summary-table.ts` 新規 (Apex 統合表)
- `render/intra-class-call-graph.ts` 新規 (Mermaid)
- `render/flow-sequence-table.ts` 新規 (Flow シーケンス)
- `render/trigger-processing-summary.ts` 新規 (Trigger サマリ)
- `render/render.ts` の `renderApex` / `renderApexTriggers` / `renderFlows` で新 builder を呼び出してテンプレートに渡す
- Mermaid 多行値が `<%~ %>` で出力されたときに閉じフェンスが glue する念のため対策として `ensureTrailingNewline` ヘルパーで全ての Mermaid 値に末尾改行を保証 (`postProcessMarkdown` で問題ないことが確認できたが防御的に残す)
- `eta-engine.ts` に `postProcessMarkdown` を追加し `renderEta` 経由で全テンプレ出力に適用

## 検証 (sfai-trial)

| 確認項目 | 結果 |
|---|---|
| `apex/AccountBalanceService.md` 処理概要表 | 2 メソッド (recalculate / computeRiskTier) が SOQL/DML/分岐/ループ/呼出先付きで描画 ✓ |
| `apex/AccountBalanceService.md` クラス内呼出 Mermaid | `recalculate --> computeRiskTier` の関係が描画 ✓ |
| `apex/InvoicePdfController.md` メソッド一覧表 | ヘッダ区切り直後にデータ行が連続 (空行なし) ✓ |
| `flows/Order_AutoCreateShipmentOnApproval.md` 実行シーケンス表 | 1 要素 (`Create_Shipment`) の表が破綻なく描画 ✓ |
| Apex / Trigger / Flow の Mermaid 閉じフェンス | 値の最終行と独立した行で `\`\`\`` が出力 ✓ |
| 各エンティティの 既存 `purpose` ブロック | 過去の `/sfai-explain` 出力 (例: AccountBalanceService の AI 推定文) が保全 ✓ |
| `sfai sync` warnings | **0** (Phase 12 から維持) |

## 設計判断のポイント

### なぜ「処理概要 + 処理詳細」を二段構えで決定的に出すか

- 設計書として読まれるには **件数 / 分岐数 / 呼び出し先** といった **事実** が一目で見える表が要る
- 既存 Phase 8 メソッド単位 Mermaid は **詳細レベル** の最深部 (1 メソッド内部のフロー)
- 今 Phase で追加した「処理概要表」は **クラス全体の俯瞰** という別レベル
- AI_MANAGED 自然言語と組み合わせて、表と文と図の三位一体で「ファクト + 文脈」を提供する構成が「設計書らしさ」を生む

### Markdown レンダリング修正は値レイヤではなく出力レイヤで

- テンプレート側で `<% .forEach %>` を全て手で書き換えると、テンプレート数 ≈ 21、ループ数 ≈ 50 個近い修正になりレビュー困難
- 後処理 (`postProcessMarkdown`) は **正規表現 1 つ** で全テンプレートに効くため、保守性が圧倒的に高い
- 既存 golden test (HUMAN_MANAGED マージ) は表構造に影響しない箇所をテストしているため、後処理を入れても影響なし → 全テスト pass を確認

### `narrative` (Phase 12) と `processing-overview-narrative` (Phase 13) の役割分担

明確な分担:

| ブロック | 何を書くか |
|---|---|
| `narrative` (Phase 12) | **なぜ存在するか** (業務上の存在意義) |
| `business-scenario` (Phase 12) | **どんな業務シーンで呼ばれるか** (利用文脈) |
| `processing-overview-narrative` (Phase 13) | **処理として何をしているか** (動作の俯瞰) |
| `processing-details-narrative` (Phase 13) | **メソッド/要素単位で何をしているか** (動作の詳細) |
| `key-design-decisions` (Phase 12) | **なぜこの設計にしたか** (実装トレードオフ) |
| `operational-notes` (Phase 12) | **運用で気をつけること** (留意点) |

役割が分かれているため、AI が `/sfai-explain` で書く際もどのブロックに何を書くべきか一意に決まる。

## 既存仕様との非破壊性

- Phase 8 `/sfai-explain` 出力 (`purpose` 内の AI 推定文) は **完全保全** (`AccountBalanceService.md` で確認)
- 全 Phase 1〜12 の 235 テストはすべて pass を維持、新規 +11 件で 246 件
- 3 層分離 (DETERMINISTIC / AI_MANAGED / HUMAN_MANAGED) を維持
- `sfai sync` warnings=0 を Phase 12 から継続

## 残課題 (Phase 14 以降)

- **AI_MANAGED ブロック内部の自動生成**: `/sfai-explain` を `narrative` / `business-scenario` / `processing-overview-narrative` / `processing-details-narrative` 等の複数 ID に対応させる
- 横断ドキュメント: 権限マトリクス / 自動化マトリクス
- StaticResource / Tab / Application Tab の取り込み
- 再現性 CI: `/sfai-explain` を温度 0 / プロンプトハッシュ / N-run 一致で固定
- 路線 C (公開準備): GitHub Issue/PR テンプレ / `docs/01-getting-started/` 充実

## 関連ナレッジ

- decisions/[Phase 13 着手計画](./2026-05-09-phase-13-plan.md)
- decisions/[Phase 12 完了](./2026-05-09-phase-12-completion.md) (narrative 等の AI_MANAGED 拡充の正本)
- decisions/[Phase 8 完了](./2026-05-08-phase-8-completion.md) (`purpose` 保全要件)
