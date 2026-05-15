---
description: sample-project プロジェクトのオンボーディングを persona 別に行う
argument-hint: [--role new_joiner|reviewer|release_manager|customer_facing]
---

# /onboard $ARGUMENTS

このプロジェクト (sample-project) のオンボーディングを **persona 別** に最適化された読み順 + subagent で実施。

## ステップ 0: persona の決定

`$ARGUMENTS` から `--role` を抽出:
- 指定なし → `new_joiner` (既定)
- `--role reviewer` → reviewer 向け
- `--role release_manager` → リリース担当向け
- `--role customer_facing` → 顧客対応担当向け

## ステップ 1: コンテキスト取得

```bash
yohaku onboard context --role <persona>
```

返ってきた JSON から:
- `goal`: persona のゴール
- `readOrder`: 推奨読み順 (`domains:*` は実際のドメイン ID 配列に展開済)
- `primaryAgent`: 起動すべき subagent

## ステップ 2: 既存ナレッジ確認

`.agents/knowledge/INDEX.md` をスキャン。persona に関連する `decisions/` / `pitfalls/` / `wins/` を最大 3 件確認。

## ステップ 3: persona 別 subagent を起動

`primaryAgent` フィールドに応じて Task ツールでサブエージェントを起動:


| persona | subagent | 起動内容 |
|---|---|---|
| new_joiner | onboarding-guide | 段階的提示、対話的深掘り |
| reviewer | review-assistant | 直近 change_summary をレビュー観点で要約 |
| release_manager | release-advisor | 直近 release_doc + 抜け漏れ pitfalls 検出 |
| customer_facing | customer-impact-explainer | 顧客視点に翻訳、業務用語化 |


## ステップ 4: 進捗記録

セッション開始時:
```bash
yohaku onboard state record-step --role <persona> --step "session-start"
```

主要ステップ完了ごとに:
```bash
yohaku onboard state record-step --role <persona> --step "<step-id>" --entities <comma-separated>
```

質問を受けるたびに:
```bash
yohaku onboard state increment-questions --role <persona>
```

## ステップ 5: ロール別アウトプット指針

### new_joiner
- 段階的に提示 (一度に全部見せない)
- 主要オブジェクト 5 件から開始
- 質問駆動で深掘り
- 30 分以内に「主要ドメイン理解」が達成目標

### reviewer
- 直近 change_summary を 5 分で要約
- 重点確認ポイント 3〜5 件
- 過去類似差分の pitfalls 引用

### release_manager
- 直近 release_doc の抜け漏れチェック
- manualSteps の依存順序確認
- rollback ドラフトの妥当性確認
- Go/No-Go 追認

### customer_facing
- 技術用語 → 業務用語 翻訳
- 営業 / 経理 / 管理者別の影響整理
- 想定 FAQ 提示
- 顧客周知文ドラフトの確認 (HUMAN_MANAGED 領域、勝手に書き換えない)

## ステップ 6: 不明点の対処

- 業務文脈は **推測しない** → `docs/human/` から引用 or 「分かりません」
- 知識グラフから取れない情報は不確かさ語 ("〜の可能性") で表現
- 過去の判断は `.agents/knowledge/decisions/` から引用
- 新規発見は `.agents/knowledge/pitfalls/` または `improvements/` に **必ず記録**

## 禁則

- HUMAN_MANAGED ブロックを書き換えない
- 業務文脈の捏造禁止
- 顧客周知文の自由生成禁止 (テンプレート埋め込み or HUMAN_MANAGED 経由)
- 「分からない」を恐れない (ハルシネーションより信頼)

## 関連 ADR

- decisions/[Phase 5 計画](../../.agents/knowledge/decisions/2026-05-08-phase-5-plan.md)
- decisions/[source 列必須化](../../.agents/knowledge/decisions/2026-05-07-source-column-three-layer-boundary.md)
