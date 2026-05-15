---
type: retrospective
date: 2026-05-07
cycle: Phase 2 サイクル 2-8 (検証ゲート)
phase: Phase-2
tags: [phase-2, cycle-2-8, validation-gate, dev-edition, ux-feedback]
---

# Retrospective: Phase 2 検証ゲート

## サイクル要約

利用者が Salesforce Developer Edition で `yohaku-trial` プロジェクトを構築し、`yohaku init` → `yohaku graph build` → `yohaku render` → Claude Code から `/onboard` `/explain` を実行する一連のフローを完走。**検証ゲート通過**を確認した。

検証中に **2 件の重大バグ** を発見・即修正:
1. symlink isDirectInvoke バグ (CRITICAL)
2. 標準オブジェクト Custom Field の FK 制約バグ (HIGH)

## 1. 要件整理 — 学び

- 利用者が会社プロジェクトを使えない事情から **Dev Edition + ダミーデータ** で検証する設計が功を奏した
- `examples/sample-project/` を起点にすることで、利用者は Dev Edition 取得 → メタデータ作成のステップを大幅短縮できた

## 2. 計画立案 — 学び

- 検証ゲートを Phase 2 最後に置く設計は正解だった: **smoke / unit テストで検出できないバグ 2 件**を実環境でしか拾えなかった
- 事前に `docs/01-getting-started/dev-edition-setup.md` を準備したことで、利用者の手戻りを最小化

## 3. 実行 — 学び

- 利用者の検証は順調に進んだが、**npm link 経由での実行**で初期トラブル (silent exit) → ローカル直接実行とは異なる挙動を確認
- FK バグは私の手元の sample-project (Custom Object のみ) では再現せず、Dev Edition の実装パターン (標準オブジェクト + Custom Field) で初めて顕在化

## 4. レビュー — 学び

- **検証ゲートの本質的価値**: 「動く / 動かない」を二値で判定するのではなく、**実環境でしか検出できないバグの抽出装置** として機能した
- 修正サイクルが極めて速かった (バグ報告 → 修正コミット → ユーザ環境で動作 ≒ 数分)
- 修正は symlink (`isDirectInvoke`) と SQL FK (`ensureReferencedObjectStubs`) の 2 箇所、いずれも構造的な仕組み修正で対応 (workaround ではなく根本対応)

## 5. 修正・再実装 — 学び

- 利用者環境で symlink 経由のテストをしていなかったのは盲点 → improvements に「CI で symlink 経由テストを追加」として記録予定
- sample-project に標準オブジェクトのケースを追加すれば事前検出できた → 同 improvements

## 6. 整理 — 学び

- 検証ゲート通過時に Phase 2 完了 ADR + 残課題整理 + 利用者フィードバック記録を一気に行うルーチンが定着しつつある

## 7. 課題提起 — 次サイクルへの種

### 利用者からの UX フィードバック (重要)

> 「コマンド実行数が多い」

具体的には:
```
yohaku init --profile minimal --project-name yohaku-trial --language ja
yohaku graph build
yohaku render system-index
yohaku render objects
```

**4 コマンド** をシーケンシャルに叩く必要があった。日常運用では `graph build → render` の 2 コマンドが頻繁、初回セットアップでは 4 コマンド必要。

### Phase 2.5 (UX 改善サブサイクル) で対応する内容

詳細: [improvements/2026-05-07-cli-ux-consolidation.md](../improvements/2026-05-07-cli-ux-consolidation.md)

- `yohaku init --bootstrap`: init + graph build + render を 1 コマンドで
- `yohaku render` (ターゲット省略): system-index + objects 全描画
- `yohaku sync`: graph build --incremental && render の日常コマンド

### Phase 3 への申し送り

- AI 出力の再現性を本格的に検証する初の Phase
- 一致率 CI 80% 強制
- subagent 並列起動の実コスト測定 (Phase 2 では設計のみ)

## 良かった点 (Keep)

- **検証ゲート設計が機能した**: 実環境バグ 2 件 (CRITICAL + HIGH) を抽出
- **Dev Edition + ダミーデータ戦略**: 顧客固有情報を扱わずに本番相当の検証ができた
- **修正ループの速さ**: バグ報告 → pitfall 記録 → コード修正 → ビルド → 利用者動作確認 が短時間で回った
- **symlink バグ対応**: `realpathSync` で根本対応、workaround を選ばなかった
- **FK バグ対応**: Salesforce DX の典型パターンを **正面から扱う** 設計 (`ensureReferencedObjectStubs`)

## 課題 (Problem)

- **CI に symlink 経由テストが無い**: 同じバグが Phase 3 以降の他の bin script (Phase 6 の yohaku init 等) でも起きうる
- **sample-project に標準オブジェクト + Custom Field パターンが無い**: Phase 2.5 で追加
- **コマンド数の多さ**: 利用者から明示的に UX 課題として指摘 → Phase 2.5 で対応

## 試したいこと (Try)

- Phase 2.5 の最後に「再度 Dev Edition で `yohaku init --bootstrap` 一発で全完了するか」の動作確認
- Phase 3 で AI 関与する subagent を本格的に動かしたとき、`yohaku metrics record` を hook 経由で自動呼び出しする仕組みの試行

## 蓄積された関連ナレッジ

- decisions/[Phase 2 完了宣言](../decisions/2026-05-07-phase-2-completion.md)
- pitfalls/[symlink isDirectInvoke](../pitfalls/2026-05-07-symlink-isDirectInvoke-bug.md)
- pitfalls/[FK 制約バグ](../pitfalls/2026-05-07-foreign-key-standard-object-fields.md)
- improvements/[CLI UX 改善](../improvements/2026-05-07-cli-ux-consolidation.md) (次サブサイクル候補)
