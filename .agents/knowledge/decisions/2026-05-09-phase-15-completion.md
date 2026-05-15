---
type: decision
date: 2026-05-09
title: Phase 15 完了 — `/yohaku-explain` 実機検証 (実 AI 推論で end-to-end)
status: completed
tags: [phase-15, completion, yohaku-explain, end-to-end-validation, real-ai]
---

# Phase 15 完了

## 結果サマリ

| 指標 | 完了前 | 完了後 |
|---|---|---|
| `yohaku explain-write` の実 AI 推論動作確認 | 未検証 (Phase 14 は擬似テキスト) | **5 エンティティ × 21 ブロックで動作確認済** |
| 検証で見つかった課題 | — | pitfalls 1 / wins 1 / improvements 4 件を追記 |
| `yohaku sync` 再実行後の AI_MANAGED 保全 | — | **全 21 ブロック保全** ✓ |
| Phase 8 既存 `purpose` の保全 | OK | **OK** (回帰なし、再々検証) |
| `yohaku sync` warnings | 0 | **0** (維持) |
| コード変更量 | — | **0 行** (基盤側は Phase 14 で完成済、本 Phase は検証のみ) |

## 実機検証結果

claude-code セッション内の私 (= AI) が `explain-writer` subagent の指針 (`scaffold/.claude/agents/explain-writer.md.eta`) に従い、知識グラフのファクトのみを材料に各ブロック本文を生成 → `yohaku explain-write` で書き戻すフローを実演:

| # | Kind | FQN | 書き込んだ ID 数 | 結果 |
|---|---|---|---|---|
| 1 | apexClass | `ClaimDashboardController` | 5 (narrative / business-scenario / key-design-decisions / processing-overview-narrative / processing-details-narrative) | `updated=5 skipped=0` |
| 2 | apexClass | `AccountBalanceService` | 5 (Phase 14 擬似テキストの上書き再生成) | `updated=5 skipped=0` |
| 3 | apexTrigger | `OrderTrigger` | 4 (narrative / operational-notes / processing-overview-narrative / processing-details-narrative) | `updated=4 skipped=0` |
| 4 | object | `Invoice__c` | 3 (summary / narrative / business-domain) | `updated=3 skipped=0` |
| 5 | flow | `Order_AutoCreateShipmentOnApproval` | 4 (Phase 14 擬似テキストの上書き再生成) | `updated=4 skipped=0` |

**合計 21 ブロック書き込み完了**、全件 `yohaku sync` 再実行後も保全。

### 評価観点ごとの結果

| 観点 | 評価方法 | 結果 |
|---|---|---|
| **ファクト整合性** | DETERMINISTIC の数値・名前と AI 文面が矛盾しないか | ⚠ AccountBalanceService で SOQL 検出漏れあり (pitfalls 記録)、その他は整合 |
| **捏造防止** | 知識グラフに無い情報を書いていないか | ✓ 推測には「(推測)」を明示、事実は graph query / DETERMINISTIC ブロックから取得 |
| **設計書らしさ** | 3 ヶ月後の自分が読んで業務理解できるか | ✓ 業務シナリオ (Given/When/Then) と隣接オブジェクト関係が読める |
| **形式** | Markdown 表崩れ / マーカー破損なし | ✓ Phase 13 の `postProcessMarkdown` が効いて表は崩れず、マーカー数も保全 |
| **再生成性** | 同じファクトから似た文面が出るか | ✓ Phase 14 擬似 (人間記述) と Phase 15 AI 推論で骨子は近い (両方とも bulk 安全 / しきい値集約 / トランザクション境界に言及) |
| **HUMAN_MANAGED 不可侵** | 人間の聖域に書き込んでいないか | ✓ registry が物理的に許容しないため、構造上不可能 |

### 課題発見 (1 件)

**`method-summary-table` が `for (... : [SELECT ...])` 形式の SOQL を検出しない**

`AccountBalanceService.recalculate` の DETERMINISTIC `processing-overview-table` で SOQL=0 と表示されるが、ソースには `for (AggregateResult ar : [SELECT ...])` 形式のインライン SOQL aggregate が 1 件存在する。`controlFlows` の抽出が `for` ループのヘッダー式から SOQL を切り出していない可能性。

詳細・修正方針は [pitfalls/2026-05-09-method-summary-table-soql-detection.md](../pitfalls/2026-05-09-method-summary-table-soql-detection.md) に記録。Phase 16 候補。

回避策: Phase 15 の AI 推論では、外部呼出列の `SUM` / `ar.get` キーワードから SOQL aggregate の存在を併せて推測し、矛盾しない文面を書いた。

## 設計判断のポイント

### 「DETERMINISTIC のみを材料」の制約は守る

subagent 指針は「DETERMINISTIC ブロックの内容のみを材料にする」と限定している。Phase 15 の検証では、ソースコードを直接読みたい誘惑があったが、再生成性を担保するために守った。

代わりに **DETERMINISTIC の数値列 + 外部呼出列の文字列 + ER 図 + 隣接エンティティの Markdown** を併読することで、十分な情報量が得られた。

### 推測には「(推測)」を必ず付与

「Apex Trigger ではなく Flow を選択している理由は ... 業務担当者が条件を後から調整できる形にしているためと推測される」のように、ファクトでない部分は明示的に推測マーカーを付ける。これにより読者が「事実 vs 推測」を区別できる。

### Phase 14 擬似テキストとの比較

両方とも DETERMINISTIC を材料にしているため、骨子はかなり近い (bulk 安全 / しきい値ロジック / トランザクション境界 / 業務シナリオの選択など)。しかし以下の差が見られた:

| 観点 | Phase 14 擬似 (人間) | Phase 15 AI 推論 |
|---|---|---|
| ファクト数値の引用 | 一部曖昧 (「SOQL 1 件」と書いていたが表は SOQL=0) | 表に厳密に従い、外部呼出から推測 |
| 推測の明示 | 暗黙 (「推測される」と書く程度) | 「(推測)」マーカーを多用 |
| 隣接エンティティの参照 | 簡素 | ER 図を活用して上流/下流を具体的に書く |
| 設計判断の材料 | 業務知識ベース | DETERMINISTIC の構造 (try/catch なし、ループ数等) ベース |

→ AI 推論版の方が **再生成性が高く、ファクトに忠実**。一方、業務知識を入れた人間記述の方が **読み物として深い**。両者を組み合わせる (HUMAN_MANAGED で業務文脈を補う) のが理想。

### Markdown 表崩れ修正 (Phase 13) が効いた

Phase 13 で導入した `postProcessMarkdown` のおかげで、AI が大量の Markdown を書き戻しても表崩れが発生しなかった。Phase 13 の判断が Phase 15 の検証成功に直接寄与。

## 既存仕様との非破壊性

- Phase 8 `purpose` 保全契約は再々検証済 (`AccountBalanceService.md` の既存内容が無傷)
- Phase 13 の `postProcessMarkdown` が効いて Markdown 表崩れなし
- Phase 14 の registry 検証が早期エラーガードを担保
- 246 + 10 = 256 テストすべて pass を維持
- 3 層分離 (DETERMINISTIC / AI_MANAGED / HUMAN_MANAGED) を完全保全
- `yohaku sync` warnings=0 を維持

## 残課題 (Phase 16 以降)

- **`method-summary-table` の SOQL 検出改善** ([pitfalls/2026-05-09-method-summary-table-soql-detection.md](../pitfalls/2026-05-09-method-summary-table-soql-detection.md))
- **explain-writer の改善 4 件** ([improvements/2026-05-09-explain-writer-improvements.md](../improvements/2026-05-09-explain-writer-improvements.md)):
  - 1: ソース参照のオプトインフラグ
  - 2: dry-run mode (書き戻し前 diff 表示)
  - 3: subagent prompt に文例を追加
  - 4: kind 自動判定 (`--auto-kind` または fqn 単独指定)
- **再現性 CI**: 温度 0 / プロンプトハッシュ / N-run 一致
- **大量エンティティへの一括 explain-write** (現状は 1 エンティティずつ)
- **LWC / Aura / FlexiPage / VFP / VFC / Lightning App の AI 推論検証** (Phase 15 では Apex / Object / Flow / Trigger のみ)
- **路線 A**: 実プロジェクト適用 (明日以降の予定どおり)
- **路線 C**: 公開準備 (GitHub Issue/PR テンプレ / `docs/01-getting-started/`)

## 関連ナレッジ

- decisions/[Phase 15 着手計画](./2026-05-09-phase-15-plan.md)
- decisions/[Phase 14 完了](./2026-05-09-phase-14-completion.md) (基盤の正本)
- pitfalls/[method-summary-table SOQL 検出漏れ](../pitfalls/2026-05-09-method-summary-table-soql-detection.md) (Phase 16 候補)
- wins/[explain-writer end-to-end 検証成功](../wins/2026-05-09-explain-writer-end-to-end-validation.md)
- improvements/[explain-writer 改善 4 件](../improvements/2026-05-09-explain-writer-improvements.md)
