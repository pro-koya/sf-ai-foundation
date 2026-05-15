---
type: improvement
date: 2026-05-13
title: /sfai-explain に「一括」と「資材カテゴリ単位」の実行モードを追加
status: idea
tags: [v0.3.0, user-requested, v0.4.0-candidate, sfai-explain, ux, bulk-execution]
---

# /sfai-explain に「一括」と「資材カテゴリ単位」の実行モードを追加

## Before

現状の `/sfai-explain <kind> <fqn>` は **1 つの資材 (fqn)** を必須引数として要求する。複数の Apex クラス・複数の Object をまとめて更新したい場合、利用者は資材ごとに個別に slash command を実行する必要があり、初回 onboarding 後の "全体一斉更新" や、特定種類だけの再生成 (例: `apexClass` 全部) で手数がかかる。

実利用 (2026-05-13) では Apex 1 本の処理に 7 ブロック更新が走ったが、プロジェクトに Apex が数十〜数百あるとき、これを 1 本ずつ叩く運用は現実的でない。

## After (構想)

新たに 2 つの実行モードを追加する:

### モード A: 全資材一括 (`--all`)

```
/sfai-explain --all
```

知識グラフから全エンティティを列挙し、AI_MANAGED が空 / 古いものを優先的に順次更新する。並列度は CLI 側で制御 (デフォルト 1 並列 = 安全側)。

### モード B: 資材カテゴリ単位 (`--kind-only <kind>` or `--kind <kind> --all`)

```
/sfai-explain --kind apexClass --all
/sfai-explain --kind customObject --all
/sfai-explain --kind flow --all
```

知識グラフから指定 kind のエンティティを列挙し、まとめて更新する。

### 共通仕様 (案)

- `--dry-run`: 対象一覧と推定トークン量だけ出す (実書き戻しはしない)
- `--filter <glob>`: `--kind apexClass --filter 'MX_*'` のようにサブ集合指定
- `--skip-fresh`: 既に AI_MANAGED が埋まっているものはスキップ
- 進捗表示: `[12/47] MX_OpportunityTriggerHandler ... ok (updated=7)`
- 途中失敗時の再開: `--resume` で前回の中断地点から続行

## 変更内容 (案)

- `sfai explain-write` に `--all` / `--kind-only` フラグを追加 (CLI 層)
- `/sfai-explain` skill (`.claude/commands/sfai-explain.md`) の Step 1 引数解釈を拡張
- ループ実装: 各資材ごとに「ソース読み → AI 推論 → JSON 書き出し → explain-write」を逐次実行
- AI 推論部分は **1 資材 = 1 セッション** を維持 (コンテキスト混線を避ける)

## 効果測定

- 数十エンティティを抱える実プロジェクトでの初回フル更新が **手作業数十回 → 1 コマンド** に圧縮
- v0.3.0 DoD #3 (AI 任せ可能比率) の実測値を押し上げる主因になる
- Week 1〜2 のヒアリングで「全件更新が必要な場面」の頻度を確認できる

## スコープ判定 (重要)

**v0.3.0 Out of Scope**: 本機能は `/sfai-explain` 機能追加 + 新サブコマンド相当 + 新フラグ群であり、`decisions/2026-05-10-v0.3.0-internal-validation-plan.md` §Out of Scope の **「AI 推論基盤の機能拡張」「新サブエージェント / 新 slash command の追加」「`/sfai-explain` 機能追加」** に明確に抵触する。

→ **v0.4.0 候補**として本 improvement に記録するのみで、v0.3.0 内では実装しない。Phase スコープ規律 §3.2 に従う。

ただし以下は v0.3.0 内で許容される:
- 利用者が現状 1 本ずつ叩くことで生じる **痛みを Week 1〜4 で観察** し、優先度の裏付けデータを蓄積する
- 痛みが極めて大きい (= DoD 達成を阻害する) と判明したら、v0.3.0 完了 ADR で v0.4.0 第 1 優先機能として明示する

## 設計上の留意 (v0.4.0 検討時に思い出すこと)

- **再現性**: 一括実行でも各資材の出力は決定論的に固定する (温度 0、プロンプトハッシュで再現)
- **冪等性**: `--all` を 2 回連続で叩いても、AI_MANAGED の内容が安定する
- **コスト**: トークン消費が一気に膨らむため、必ず `--dry-run` で事前見積りできる
- **失敗の局所化**: 1 資材の失敗が全体停止につながらない (per-entity isolation)
- **HUMAN_MANAGED 保全**: 一括実行でもマーカー破壊リスクが上がらないこと (既存 `replaceBlockContent` の信頼性に依存)
- **AI コンテキスト混線**: 1 資材 = 1 推論セッションを徹底し、前資材の影響を持ち越さない

## 代替案 (即実施可能)

v0.4.0 を待たずに今すぐ「擬似一括」を実現する手段として、AI エージェント側で **slash command を順次自走** させる運用がある:

1. 利用者が `kind apexClass` の全 fqn を `sfai graph query` で取得
2. AI に「このリストを上から順に `/sfai-explain apexClass <fqn>` で処理して」と依頼
3. AI が 1 件ずつ slash command を発行

これは v0.3.0 の Out of Scope を侵さない (CLI も skill も改変しない) ため、Week 1 以降の運用テンプレとして提案可能。

## 次の改善案

- v0.4.0 着手 ADR でこの improvement を最優先候補として再評価する
- Week 1 で「擬似一括」運用を試し、痛みの定量データ (回数 / 所要時間) を取る
- 一括実行とコスト計測 ([metrics-claude-code-session-integration](./2026-05-13-metrics-claude-code-session-integration.md)) はセットで設計する

## 関連ナレッジ

- decisions/[2026-05-10-v0.3.0-internal-validation-plan](../decisions/2026-05-10-v0.3.0-internal-validation-plan.md) — Out of Scope の根拠
- improvements/[2026-05-13-metrics-claude-code-session-integration](./2026-05-13-metrics-claude-code-session-integration.md) — 一括実行時のコスト把握とセットで必要
- improvements/[2026-05-09-explain-writer-improvements](./2026-05-09-explain-writer-improvements.md) — 既存 explain-writer 改善案 (dry-run / `--auto-kind`) と統合検討
- review-result/[v0.3.0 ベースライン §9-3](../../review-result/baseline.md)
