---
type: decision
date: 2026-05-09
title: Phase 12 完了 — 設計書としての本物化 (路線 D) + Visualforce/Lightning App 取り込み (路線 B) + ER 図
status: completed
tags: [phase-12, completion, narrative, visualforce, lightning-app, er-diagram]
---

# Phase 12 完了

## 結果サマリ

| 指標 | 完了前 | 完了後 |
|---|---|---|
| 取り込みメタデータ種別 | 18 | **21** (+ VisualforcePage / VisualforceComponent / CustomApplication) |
| yohaku-trial 出力ファイル数 | 66 | **69** |
| ユニットテスト件数 | 226 | **235** (+9: VFP 2, VFC 2, App 2, ER 図 3) |
| `yohaku sync` warnings | 0 | **0** (維持) |
| Phase 8/11 の `/yohaku-explain` 出力保全 | OK | **OK** (purpose ブロック既存内容を保全) |
| 設計書として書ける AI_MANAGED ブロック数 (Apex) | 2 (purpose / concerns) | **5** (+ narrative / business-scenario / key-design-decisions) |
| ER 図 | なし | **system-overview.md に Mermaid erDiagram で描画** |

## 実装内容

### 12-D: 設計書としての本物化 (AI_MANAGED ブロック拡充)

利用者からの指摘「メタ情報によりすぎていて設計書とは言えない」に対する応答。テンプレートの DETERMINISTIC は変更せず、**自然言語で記述する余白を AI_MANAGED ブロックとして増設**:

| テンプレート | 既存 | 新規追加 |
|---|---|---|
| `apex-class.eta` | purpose / concerns | + `narrative` / `business-scenario` / `key-design-decisions` |
| `apex-trigger.eta` | purpose / concerns | + `narrative` / `operational-notes` |
| `flow.eta` | purpose / concerns | + `narrative` / `business-scenario` / `operational-notes` |
| `object.eta` | summary | + `narrative` / `business-domain` |
| その他 (LWC/Aura/FlexiPage/Layout/PS/Profile/VR/RT/AP/SR/CMR/NC/RSS) | purpose | (改修なし) |

各ブロックは見出し付きでテンプレート側にプレースホルダを置き、AI が `/yohaku-explain` 拡張で書き込む想定。**今 Phase ではブロック枠の追加までを行い、AI 自動生成は次 Phase**。

#### 後方互換性の確保 (重要)

- `purpose` ブロックは **削除しない** ことで `AccountBalanceService.md` の既存 AI 推定文が保全される (Phase 8 完了 ADR の保全要件)
- 新 ID (`narrative` 等) は initial sync 時にプレースホルダ文で埋まる
- ID 別に独立した merge ロジックなので、`narrative` を後から AI で書いても `purpose` 既存内容に影響しない

### 12-B1: Visualforce Page 取り込み

- 起点: `pages/<Name>.page-meta.xml` + 兄弟 `<Name>.page` (markup)
- 抽出: `controller` / `extensions[]` / `standardController` / `renderAs` (markup から検出: PDF 等) / `apiVersion` / `label` / `description` / `availableInTouch` / `confirmationTokenRequired`
- markup 解析: `<apex:*>` タグ件数 (種別別) / `{!...}` メソッド参照 (controller method 候補)

### 12-B2: Visualforce Component 取り込み

- 起点: `components/<Name>.component-meta.xml` + 兄弟 `<Name>.component`
- 抽出: `controller` (markup から) / `<apex:attribute>` 一覧 (name/type/required/description) / markup タグ件数

### 12-B3: Lightning App / CustomApplication 取り込み

- ⚠ AuraBundle の `.app-meta.xml` (in `aura/<Name>/`) と区別が必要
- adapter classifier を `(fileName, segments)` シグネチャに拡張し、`segments.includes("applications")` で分岐
- 抽出: `label` / `description` / `navType` / `formFactors[]` / `tabs[]` / `utilityBar` / `brandColor` (brand.headerColor から) / `logo`

### 12-B4: ER 図 (オブジェクト関係性)

- `graph.fields` の `referenceTo` を集約して Mermaid `erDiagram` 化
- 関係種別を区別:
  - **Master-Detail** → `||--|{` (1..* 必須)
  - **Lookup** → `||--o{` (0..* 任意)
- 参照先の標準オブジェクト (`User` / `Account` の標準等) で objects に未登録の場合は stub として描画
- `system-overview.md` の DETERMINISTIC ブロックとして追加 (新規 file は作らない)

### 共通基盤の拡張

- `types/graph.ts` に `VisualforcePage` / `VisualforceComponent` / `CustomApplication` 型 + 関連サブ型 (`VfMarkupCount` / `VfComponentAttribute`) を追加
- `KnowledgeGraph` のコレクション数: 21 → **24 keys**
- `schema/graph.schema.json` に対応する 3 種の JSON Schema を追加 (required 配列拡張)
- `local-source-adapter.ts` の classifier を 3 種拡張、`.app-meta.xml` のディレクトリ判別ロジック追加
- `graph/builder.ts` に extractor ルーティングを追加
- `graph/sqlite-store.ts` / `sqlite-reader.ts` に 3 テーブルの write/read 関数を追加
- `render/render.ts` に `renderVisualforcePages` / `renderVisualforceComponents` / `renderCustomApplications` を追加し `renderAll` の配列に組み込み
- `render/summary.ts` に 3 つの summary 関数を追加
- `render/er-diagram.ts` を新規作成
- `system-index.eta` の counts テーブルに 3 行追加

## 検証 (yohaku-trial)

| 確認項目 | 結果 |
|---|---|
| `applications/Greenleaf_Console.md` (CustomApplication) | navType=Console / Tab 3 件 / brandColor=#2e7d32 ✓ |
| `visualforce-pages/InvoicePdf.md` (VFP) | controller=InvoicePdfController / renderAs=pdf / apex タグ 12 種 / メソッド参照 18 件 ✓ |
| `visualforce-components/InvoiceLine.md` (VFC) | 公開属性 7 件 (lineNumber/orderNumber/...) / 全 required フラグ正しく検出 ✓ |
| `system-overview.md` の ER 図 | Master-Detail と Lookup を区別、12 リレーション可視化 ✓ |
| `apex/AccountBalanceService.md` の `purpose` ブロック | 既存 AI 推定文が **回帰なく保全** ✓ |
| `apex/AccountBalanceService.md` の `narrative` 等の新ブロック | プレースホルダ文で正しく初期化 ✓ |
| `yohaku sync` warnings | **0** (Phase 11 から維持) |

## 設計判断のポイント

### purpose を残して新ブロックを追加した理由

- 既に yohaku-trial の Phase 8 で `/yohaku-explain` により `purpose` ブロックに具体的な内容が書かれている (`AccountBalanceService` 等)
- これを上書きすると Phase 8 完了 ADR の保全要件に違反する
- 新ブロックを **並列で追加** することで、既存運用を一切壊さず情報量だけを増やせた

### 自然言語ブロックの設計指針

- 各ブロックに「見出し + 短い指示文」をテンプレートに埋め込み、AI が書く方向性を示す
- ブロック粒度を 3〜5 個に分割し、1 つあたり 2〜3 段落を目安にすることで読みやすさを担保
- HUMAN_MANAGED は 1 つだけ (`business-context`) に集約 — 人間の負担を増やさない

### ER 図のスコープ判断

- 全 referenceTo を 1 つの Mermaid に詰め込むと、大規模組織で読めなくなる懸念があるが、yohaku-trial 規模では問題なし
- 大規模対応は次 Phase で「ドメイン別 ER 図」として分割可能にする (今 Phase ではスコープ外)

### `.app-meta.xml` の衝突解決

- AuraBundle (in `aura/<Name>/<Name>.app-meta.xml`) と CustomApplication (in `applications/<Name>.app-meta.xml`) は同じ suffix
- classifier を `(fileName, segments)` に拡張し、ディレクトリパスで判別する方式が最小変更で済んだ
- 既存の AuraBundle 取り込みには影響なし

## 既存仕様との非破壊性

- 全エンティティの Quick Summary パターンを踏襲 (Phase 9-A2 標準)
- 3 層分離 (DETERMINISTIC / AI_MANAGED / HUMAN_MANAGED) を全テンプレートで維持
- Phase 8 の `/yohaku-explain` 出力 (AI_MANAGED 内の customized テキスト) は sync で保全
- Phase 1〜11 までの 226 テストはすべて pass を維持

## 残課題 (Phase 13.x 以降)

- **AI_MANAGED ブロック内部の自動生成**: `/yohaku-explain` を `narrative` / `business-scenario` 等の複数 ID に対応させる
- StaticResource / Tab / Application Tab の取り込み
- 横断ドキュメント: 権限マトリクス (object × profile/PS の CRUD 集約) / 自動化マトリクス (object × Trigger/Flow/ApprovalProcess)
- ER 図のドメイン別分割 (大規模組織対応)
- Visualforce markup から Apex メソッドへの双方向参照解決 (現状はメソッド名候補のみ)
- 再現性 CI: `/yohaku-explain` を温度 0 / プロンプトハッシュ / N-run 一致で固定
- 路線 C (公開準備): GitHub Issue/PR テンプレ / `docs/01-getting-started/` 充実 / セキュリティレビュー

## 関連ナレッジ

- decisions/[Phase 12 着手計画](./2026-05-08-phase-12-plan.md)
- decisions/[Phase 11 完了](./2026-05-08-phase-11-completion.md)
- decisions/[Phase 8 完了](./2026-05-08-phase-8-completion.md) (purpose 保全要件の正本)
- 派生サマリ: [`docs/STATUS_2026-05-08.md`](../../docs/STATUS_2026-05-08.md)
