---
type: retrospective
date: 2026-05-07
cycle: Phase 3 サイクル 3-8 (検証ゲート)
phase: Phase-3
tags: [phase-3, cycle-3-8, validation-gate, yohaku-trial, classify-diff]
---

# Retrospective: Phase 3 検証ゲート

## サイクル要約

利用者の現役プロジェクト相当 (`~/Desktop/yohaku-trial` — Dev Edition retrieve 後の本格的な Salesforce DX ソース) で、`yohaku diff` + 並列 classifier subagent + change_summary スキーマ検証 の 一連を実行。**検証ゲート通過**。

## 実行内容

### 1. 環境準備 (yohaku-trial)

- 10 SObjects (Account 標準 + 9 カスタム)、57 fields、1 flow、20 apex classes
- `git init` 後 baseline コミット、続けて意図的差分 (3 ファイル変更) を `git commit`

### 2. 意図的差分の構成

| ファイル | カテゴリ | 内容 |
|---|---|---|
| `Account/fields/Risk_Tier__c.field-meta.xml` | data_model | restricted picklist (Low/Medium/High) 新規追加 |
| `permissionsets/RiskOps.permissionset-meta.xml` | permission | 新規 PermissionSet (label/desc のみ) |
| `classes/AccountBalanceService.cls` | logic | Risk_Tier__c 自動判定ロジック追加 (HIGH/MEDIUM 閾値 hardcode) |

### 3. `yohaku diff` 検証

```bash
yohaku diff --from HEAD~1 --to HEAD --json --path-prefix force-app/
```

結果:
- files=3, +42 -2
- byCategory: data_model=1, permission=1, logic=1, 他 0
- byChangeKind: added=2, modified=1
- 各ファイルが metadataType / fullyQualifiedName / category 正確に分類

### 4. 並列 classifier 実行

3 つの subagent を **1 メッセージ内で並列起動** (Task tool 経由):

| subagent | 完走時間 | tokens | 出力品質 |
|---|---|---|---|
| data-model-classifier | 34 秒 | ~40K | restricted picklist の挙動、FLS、Layout、validation 等を網羅 |
| permission-classifier | 27 秒 | ~38K | デプロイで assignment 自動付与なし / fieldPermissions 未定義 を指摘 |
| logic-classifier | 44 秒 | ~40K | hardcode 閾値 / null vs 0 パス / カバレッジ確認を指摘 |

合計 **44 秒 (並列)**、 ~118K tokens、推定 $0.30〜0.40 (sonnet)。

### 5. 結果統合 + スキーマ検証

3 つの subagent 出力を統合し `change_summary` 全体を構築。`validateChangeSummary` で **schema 適合 OK**。`docs/ai-augmented/change-summaries/2026-05-07-trial-001.json` に永続化。

## 計測 vs 目標

| 指標 | 目標 | 実測 |
|---|---|---|
| 完走時間 | 60 秒以内 | **44 秒 ✅** |
| 分類精度 (人手照合) | 80% 以上 | **100% (3/3 件、業界水準のレビュー観点を網羅)** ✅ |
| 一致率 CI | 80% 以上 | **未測定** (実 AI N=5 再実行は Phase 5 へ) |
| 手動作業見逃し | 0 件 | **0 件** ✅ (assignment / FLS / 閾値ハードコード 全部検出) |
| AI コスト | 0.50 USD 以下 | **$0.30〜0.40 ✅** |

## 1. 要件整理 — 学び

- 利用者の `yohaku-trial` が Dev Edition retrieve 直後の **本格的なメタデータ** だったため、minimal sample-project では発見できない実用品質を検証できた
- 3 カテゴリを並列でカバーすることで、相互侵食の有無を実測できた

## 2. 計画立案 — 学び

- 意図的差分を「data_model + permission + logic の 3 カテゴリ同時」に作ったのが正解 — 1 カテゴリだけだと並列性が検証できない
- 各 subagent への入力を「自カテゴリのファイルのみ」に絞ったことで、相互侵食ゼロを確認

## 3. 実行 — 学び

- subagent の出力品質が想定以上に高かった: 特に logic-classifier がハードコード閾値の Custom Metadata 化提案、null vs 0 path、Picklist API 名一致まで踏み込んだ
- permission-classifier の「fieldPermissions が未定義 → 業務要件未達」という指摘は実プロジェクトで本当に役立つレビュー観点
- スキーマ検証が **全 source 列を強制** し、未指定があれば即 fail — Tracked&lt;T&gt; 設計の正しさが実証

## 4. レビュー — 学び

- **CRITICAL ゼロ** ✓
- **HIGH 警戒点**:
  - Phase 5 で実 AI N=5 一致率の本格測定が必要 (今回は単発実行)
  - 大型 PR (50+ ファイル) でのコスト測定は別途必要
- **MEDIUM**:
  - サイクル 3-8 の前半で `git diff :^0` という不正な ref を指定して 1 度エラー → エラーメッセージ自体は git のまま透過。改善余地あり

## 5. 修正・再実装 — 学び

- 修正なし、すべて期待通り動作
- subagent system prompt が体系的だったため、出力 JSON 形式の揺らぎなし → ajv schema 一発合格

## 6. 整理 — 学び

- `docs/ai-augmented/change-summaries/2026-05-07-trial-001.json` を yohaku-trial に永続化 (検証成果物)
- 本 retrospective で記録

## 7. 課題提起 — 次サイクルへの種

### Phase 4 着手前

- [ ] Phase 4 計画 ADR (手動作業管理 + リリース準備 8 サイクル)
- [ ] manual-step-extractor / release-composer / rollback-drafter subagent 設計
- [ ] `yohaku release-prep` CLI 設計
- [ ] **検証ゲート**: 1 リリースで `/release-prep` を実運用 (yohaku-trial で再検証)

### Phase 5 への申し送り

- 一致率 CI 実 AI 統合 (N=5 再実行で 80% 以上)
- 大型 PR (50+ ファイル) のコスト測定
- ゴールデンケース 3 件以上に拡充

## 良かった点 (Keep)

- **3 並列 classifier の実機動作確認**: 設計通り並列起動 + 相互侵食ゼロ
- **Tracked&lt;T&gt; / source 列 / ajv 検証**: 全部効いた、AI 出力ハルシネーション抑止に有効
- **subagent 出力品質**: hardcode 閾値の Custom Metadata 化提案など、実プロジェクトのレビューに使える品質
- **Dev Edition retrieve 直後の yohaku-trial で検証**: ダミーではなく現実的なメタデータ多様性
- **検証時間 44 秒**: 60 秒目標を大幅クリア

## 課題 (Problem)

- 一致率 CI の実測は未実施 (Phase 5 へ繰越)
- 大型 PR でのコスト最悪値は未測定
- subagent 出力の Markdown 化 (`/change-summary` slash command 部分) は実機で未通し → Phase 4 の検証ゲートで併せて確認

## 試したいこと (Try)

- Phase 4 で `/release-prep` を実装後、本検証ゲートと同じパターン (yohaku-trial での 1 リリース実行) で確認
- Phase 5 で実 Claude API を `runConsistencyCheck` に統合し、本ケース (Risk_Tier__c) を N=5 再実行で一致率を計測

## 蓄積された関連ナレッジ

- decisions/[Phase 3 構造的完了](../decisions/2026-05-07-phase-3-completion.md)
- decisions/[source 列必須化](../decisions/2026-05-07-source-column-three-layer-boundary.md)
- 関連: retrospectives/[Phase 3 (3-1〜3-7)](./2026-05-07-phase-3.md)
