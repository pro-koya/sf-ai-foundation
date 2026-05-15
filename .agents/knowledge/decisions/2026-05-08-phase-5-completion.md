---
type: decision
date: 2026-05-08
title: Phase 5 (オンボーディング本格化) 完了 — yohaku-trial で検証ゲート通過
status: active
tags: [phase-5, completion, milestone, onboarding, persona, faq]
---

# Phase 5 完了宣言

## 判断

Phase 5 のサイクル 5-1 〜 5-6 を完了。検証ゲートも yohaku-trial で通過。**Phase 5 完了**。

## 達成したサイクル

| # | 成果物 | ファイル |
|---|---|---|
| 5-1 | context-map ローダ + 4 persona テンプレ | `src/onboarding/{types,context-map}.ts`, `scaffold/.yohaku/context-map.yaml.eta` |
| 5-2 | onboarding-state 進捗記録 | `src/onboarding/state.ts` (recordStep / incrementQuestions / reset) |
| 5-3 | persona 別 subagent (3 種) | `scaffold/.claude/agents/{review-assistant,release-advisor,customer-impact-explainer}.md.eta` |
| 5-4 | `yohaku onboard` CLI + `/onboard --role` 拡張 | `cli.ts` 3 サブコマンド、`scaffold/.claude/commands/onboard.md.eta` 全面更新 |
| 5-5 | FAQ 蓄積機構 + PII フィルタ | `src/onboarding/faq.ts` (parseDialogLog / extractFaq / renderFaqMarkdown、secrets/mask 再利用) |
| **5-6** | **検証ゲート** | **yohaku-trial で 4 persona の context 取得 / state 記録 / FAQ 抽出 / review-assistant 起動を実機完走** |

## 検証ゲート結果

### 計測 vs 目標

| 指標 | 目標 | 実測 |
|---|---|---|
| `yohaku onboard context --role new_joiner` 動作 | OK | ✅ 4 ドメイン + readOrder の `domains:*` 展開 |
| `yohaku onboard state record-step` 動作 | OK | ✅ persona ごとに完走、entities 蓄積 |
| `yohaku onboard state increment-questions` 動作 | OK | ✅ 累積カウント |
| FAQ 抽出 + PII マスキング | OK | ✅ `yamada@example.com` → `[HASHED:email-address:...]` |
| review-assistant 動作 | OK | ✅ 22 秒で 5 件のレビュー観点 + 2 件 cross-cutting 提示 |
| AI コスト (review-assistant 単発) | $0.30 以下 | ✅ ~$0.10 (40K tokens) |

### 検証成果物 (yohaku-trial)

```
.yohaku/
├── context-map.yaml          (4 persona × 2 domains 設定済み)
├── onboarding-state.json    (new_joiner 進捗記録: 2 step / 2 entities / 1 question)
├── graph.sqlite             (Phase 1〜4 から継続)
└── secrets-rules.yaml

.claude/
├── agents/                  (14 種、Phase 5 で 3 種追加)
└── commands/                (7 種)
```

### review-assistant の出力品質 (実機)

5 件のレビュー観点 + 2 件の cross-cutting:
1. **Account.Risk_Tier__c**: restricted picklist の定義外値投入リスク + 手動作業
2. **RiskOps**: assignment 自動付与なし + fieldPermissions 未設定 + license 整合性
3. **AccountBalanceService**: 閾値ハードコード + null vs 0 + デプロイ順序
4. **cross-cutting**: デプロイ順序リスク (field → permission → logic)
5. **cross-cutting**: 権限とフィールドの整合性

「過去の類似事例」「静的解析 findings 0 件」の正直な報告も含め、ハルシネーション無しで動作。

## Phase 5 統計

| 項目 | 値 |
|---|---|
| 新規 TypeScript モジュール | 4 (`onboarding/{types,context-map,state,faq}.ts`) |
| 新規ユニットテスト | 14 件 (context-map 4 + state 5 + faq 5) |
| 新規 scaffold subagent | 3 件 (review-assistant, release-advisor, customer-impact-explainer) |
| 新規 scaffold command 関連 | 1 件 (onboard.md.eta 全面刷新) |
| 新規 scaffold setup | 1 件 (`.yohaku/context-map.yaml.eta`) |
| 新規 CLI コマンド | 5 件 (onboard context / state show / state record-step / state increment-questions / state reset / faq extract) |
| 全テスト件数 | 101/101 pass (Phase 4 末 87 → +14) |
| yohaku-trial 検証成果 | context-map / state / faq の 3 機構が実機動作 |

## トレードオフ

- **代償**:
  - context-map.yaml を利用者が編集する手間 → サンプルテンプレでデフォルト 2 domain 提示で初期負荷軽減
  - onboarding-state は gitignore のためチーム間で非共有 → Phase 7 でチーム共有版検討
- **将来課題**:
  - i18n (英訳) は Phase 7
  - 動画コンテンツ自動生成は本 OSS スコープ外
  - release-advisor / customer-impact-explainer の実機動作確認は今回 review-assistant のみ → 利用者検証で補完

## 残課題 (Phase 6 / Phase 7 へ繰越)

- **release-advisor / customer-impact-explainer の実機動作確認** (review-assistant は確認済み): Phase 6 か利用者検証で
- **FAQ 抽出の Claude Code 実会話ログ対応**: 現状は単純 Markdown の Q/A パース。Phase 7 で Claude Code session JSON 形式対応
- **チーム共有版 onboarding-state**: gitignore を外して team-state.json として共有可能にする選択肢
- **persona 別 ダッシュボード** (e.g. 進捗可視化): Phase 7

## 関連ナレッジ

- decisions/[Phase 5 計画](./2026-05-08-phase-5-plan.md)
- decisions/[Phase 4 完了](./2026-05-07-phase-4-completion.md)
- decisions/[source 列必須化](./2026-05-07-source-column-three-layer-boundary.md)
- decisions/[scaffold eta 変数規則](./2026-05-07-eta-variable-naming-convention.md)
- IMPLEMENTATION_GUIDE.md Phase 5

## 次の動き

- Phase 6 (Plugin 化 + DX MCP アダプタ) 計画 ADR 着手
- もしくは Phase 5 の review-advisor / customer-impact-explainer を yohaku-trial で実機検証してから次へ

Phase 5 を閉じ、次フェーズへ進む。
