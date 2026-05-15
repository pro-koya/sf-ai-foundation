---
type: decision
date: 2026-05-08
title: Phase 11 完了 — LWC / Aura / FlexiPage 取り込み
status: completed
tags: [phase-11, completion, lwc, aura, flexipage, ui]
---

# Phase 11 完了

## 結果サマリ

| 指標 | 完了前 | 完了後 |
|---|---|---|
| メタデータ取り込み種別 | 15 | **18** (+ LWC / Aura / FlexiPage) |
| yohaku-trial 出力ファイル数 | 60 | **66** |
| ユニットテスト件数 | 214 | **226** (+12) |
| `yohaku sync` warnings | 0 | **0** (維持) |
| Phase 8 `/yohaku-explain` 出力保全 | OK | **OK** (回帰なし) |

## 実装内容

### 11-A: LWC bundle 取り込み
- `.js-meta.xml` を起点に projectRoot から兄弟ファイル (`<name>.js`, `<name>.html`, `<name>.css`) を読み込む新規 extractor `extractLwc`
- 抽出情報: `apexImports` / `labelImports` / `publicProperties` (@api) / `wires` (@wire) / `customEvents` (dispatchEvent) / `childComponents` (`<c-foo-bar>`) / `standardComponents` (lightning-/force-/lwc-/slds-) / `directives` (lwc:if / lwc:for-each / for:each / if:true 等) / `targets` (`lightning__RecordPage` 等) / `isExposed` / bundle 構成 (HTML / CSS の有無)
- テンプレート `lwc.eta`: Quick Summary + 7 つの DETERMINISTIC ブロック (overview / apex-imports / public-api / wires / events / components / labels) + AI_MANAGED purpose + HUMAN_MANAGED business-context

### 11-B: Aura bundle 軽量取り込み
- `.cmp-meta.xml` / `.app-meta.xml` / `.evt-meta.xml` を起点に bundle kind を判定 (`Component` / `Application` / `Event`)
- bundle 構成 (Controller / Helper / Renderer / Style の有無) と attribute / handler を markup から抽出
- テンプレート `aura-bundle.eta` で軽量描画 (詳細解析は Phase 11.x 以降)

### 11-C: FlexiPage 取り込み
- `.flexipage-meta.xml` から `type` / `sobjectType` / `pageTemplate` / `regions[]` (region 内の componentInstance / fieldInstance) を抽出
- テンプレート `flexi-page.eta` で region ごとに配置コンポーネントを表示

### 共通基盤の拡張
- `types/graph.ts` に `LightningWebComponent` / `AuraBundle` / `FlexiPage` 型を追加 (関連サブ型含む 7 つ)
- `KnowledgeGraph` に `lwcs` / `auraBundles` / `flexiPages` の 3 コレクションを追加 (合計 18 → 21 keys)
- `schema/graph.schema.json` に対応する 3 種の JSON Schema 定義を追加
- `local-source-adapter.ts` の classifier に 3 種を追加
- `graph/builder.ts` に extractor ルーティングを追加
- `graph/sqlite-store.ts` / `sqlite-reader.ts` に 3 テーブルの write/read 関数を追加
- `render/render.ts` に `renderLwcs` / `renderAuraBundles` / `renderFlexiPages` を追加し `renderAll` の配列に組み込み
- `render/summary.ts` に `summaryForLwc` / `summaryForAuraBundle` / `summaryForFlexiPage` を追加
- `system-index.eta` の counts テーブルに 3 行追加

## 検証 (yohaku-trial)

| 確認項目 | 結果 |
|---|---|
| `claimDashboard.md` の Apex 呼び出し件数 | **2** (`ClaimService.getClaim` / `AccountBalanceService.recalculate`) |
| `@wire` 件数 | **2** |
| 子 LWC | `c-claim-stat-list` (検出 ✓) |
| LWC ディレクティブ | `lwc:if` 検出 ✓ |
| Aura `ClaimSummary.md` | bundle kind=Component / Controller+Helper / handler 2 件 |
| FlexiPage `Order_Record_Page.md` | type=RecordPage / sobjectType=Order__c / regions=2 / items=4 |
| `AccountBalanceService.md` purpose ブロック保全 | ✓ (AI 推定文字列が回帰なく維持) |

## 設計判断のポイント

### LWC の兄弟ファイル読み込みは projectRoot 経由
- adapter から渡される `descriptor.sourcePath` は projectRoot 相対。
- extractor 内で `resolve(projectRoot, sourcePath)` してから `dirname` / sibling を組み立てる。
- この方式により adapter (sfdx project / 将来の SFDX cli adapter) を問わず動作する。

### regex ベースの抽出に倒した理由
- LWC の JS は ES Module + デコレータ + CommonJS なし、という比較的構造的な記述に閉じる。
- AST パーサ (acorn など) を入れると依存が増え、TypeScript / 設定変動に巻き込まれる。
- 取り込みたい情報 (Apex import / @api / @wire / dispatchEvent / 子 LWC) はいずれも文法的に固定 → regex で十分網羅可能。
- 不確かなパターンは無視するベストエフォート方針 (false positive を避ける)。

### Aura の詳細解析は段階リリース
- 取得は **bundle 構成 + attribute 名 + handler event 名** に閉じた。
- inheritance / `<aura:dependency>` / 詳細イベント型まで踏み込むと Phase 11 の枠を超える。
- 移行優先度の高い組織でも「Aura が残っているか」「依存先がどこか」が見えれば十分。

### LWC ディレクティブは新旧両方を拾う
- `lwc:if` / `lwc:elseif` / `lwc:else` / `lwc:for-each` (新) と `if:true` / `if:false` / `for:each` (旧) を同じ枠で検出。
- 移行タイミングを判定する材料を残すため。

## 既存仕様との非破壊性

- 全エンティティの Quick Summary パターンを踏襲 (Phase 9-A2 標準)
- 3 層分離 (DETERMINISTIC / AI_MANAGED / HUMAN_MANAGED) を全テンプレートで維持
- Phase 8 の `/yohaku-explain` 出力 (AI_MANAGED 内の customized テキスト) は sync で保全
- secrets 非開示パターンは LWC では該当なしだが、HTML/JS から secret 値を吸い出さない設計を維持

## 残課題 (Phase 11.x 以降)

- **Lightning App** (`*.app-meta.xml` の Aura ではない方の AppManifest) の取り込み
- LWC の **import 解決精度向上**: `@salesforce/schema/X.Y` / `@salesforce/resourceUrl/X` などの定型 import のうち今回未対応のもの
- LWC の **イベント受信側** (`addEventListener` / `@api` 上の callback) の追跡
- FlexiPage の **platformActionList** / **componentInstanceProperties** の中身可視化
- Aura の `<aura:dependency>` / inheritance の追跡
- 再現性 CI: `/yohaku-explain` を温度 0 / プロンプトハッシュ / N-run 一致で固定する仕組み

## 関連ナレッジ

- decisions/[Phase 11 着手計画](./2026-05-08-phase-11-plan.md)
- decisions/[Phase 10 完了](./2026-05-08-phase-10-completion.md)
- decisions/[Phase 9.x 完了](./2026-05-08-phase-9-x-completion.md)
