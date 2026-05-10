---
type: retrospective
date: 2026-05-07
cycle: Phase 2 着手準備 (3 サイクル統合: J / K / L)
phase: pre-Phase-2
tags: [phase-2, readiness, sfdx-project, planning, checklist]
---

# Retrospective: Phase 2 着手準備

## サイクル要約

Phase 1 完遂後、Phase 2 着手前の準備として 3 サイクルを実施:

- **J**: Phase 2 計画 ADR + 検証ゲート設計 (8 サイクル分割、検証指標 5 項目、検証プロセス)
- **K**: `sfdx-project.json` の packageDirectories 対応 (Phase 1 残課題解消、3 段フォールバック、テスト 8 ケース)
- **L**: Phase 1 既知制約の pitfalls/ 化 (10 項目)、引き継ぎ改善案の improvements/ 化 (6 項目)、本振り返り

新規 ADR 2 件、新規 pitfalls 1 件、新規 improvements 1 件、新規モジュール 1 件 (`sfdx-project.ts`)、テスト 8 ケース追加。

## 1. 要件整理 — 学び

- 利用者からの「メタデータの配置先」確認質問で、本 OSS が `force-app/` を読むだけ・書かないという設計原則をユーザに改めて言語化できた
- 「これを含めて Phase 2 着手の準備を進めて」という依頼を、計画 ADR + 残課題解消 + 着手準備チェックリストの 3 サイクルに分解できた

## 2. 計画立案 — 学び

- Phase 2 を 8 サイクルに分割した。検証ゲートを最後 (2-8) に置く設計は、Phase 1 で「実環境未検証」の課題を残した教訓から
- `sfdx-project.json` の 3 段フォールバック (options → sfdx-project.json → default) は、テストの容易性とプロダクション動作の両立に効く

## 3. 実行 — 学び

- `sfdx-project.json` パーサで `packageDirectories: []` (空配列) のケースを当初見落としかけたが、テスト 4 で気づいて即修正
- `default: true` フラグの自動昇格ロジックは Salesforce DX のデフォルト推論と合わせるため必須

## 4. レビュー — 学び

- LocalSourceAdapter のテストで `mkdtempSync` を使い、各テストケースが独立した一時ディレクトリで動くようにした → 並列実行耐性
- 既存の `LocalSourceAdapter` から `forceAppDir` オプションを削除した。後方互換は破ったが、まだ Phase 1 直後で利用者ゼロのため許容
- pitfalls の 7 番 (force-app/ 固定問題) は本サイクルで解消したので **取り消し線で明示** し、解消 ADR にリンクした (古い知見を消さず Superseded 表記で残すルールに従う)

## 5. 修正・再実装 — 学び

- 既存ファイルの再書き込み時に Read 先行が必要なのを忘れて 1 度失敗。Edit / Write のルールを再確認
- Phase 2 の 8 サイクル分割で「検証ゲートを最後」とした判断を、すぐ後の improvements/ に「サイクル 2-7 で smoke test を組み込む」と補強

## 6. 整理 — 学び

- INDEX.md は今回更新を忘れている可能性 → 即追記が必要
- 古い pitfall (item 7) を取り消し線で残し、改善 ADR へのリンクを足した運用は AGENTS.md § 2.5 (衝突時の扱い) に沿う

## 7. 課題提起 — 次サイクルへの種

### Phase 2 サイクル 2-1 着手前にやること (チェックリスト)

- [ ] **CI 初回実行**: GitHub にコードを push (or `act` 等でローカル CI シミュレーション) し、`npm install && npm test` の通過を確認
- [ ] 出た型エラー / lint エラーを `pitfalls/` に逐次記録、即修正
- [ ] `secrets-rules.yaml` の YAML 読み込み実装 (`js-yaml` または `yaml` パッケージ追加)
- [ ] `extractors.ts` の分割 (8 ファイルへ)
- [ ] `cli.ts` の `KnowledgeGraphReader` 抽出と `as any` 排除
- [ ] サイクル 2-1 の retrospective を残す

### 検証プロジェクト選定

- (a) 利用者の現役プロジェクト (本命)
- (b) `examples/sample-project/` (サイクル 2-7 で構築)
- (c) Trailhead DreamHouse / E-Bikes (公開ダミー)

検証は **(b) → (a)** の 2 段構えで進めるのを推奨。利用者から (a) のプロジェクト名 / アクセス可否を Phase 2 サイクル 2-8 開始時に確認する。

### Phase 2 全体への申し送り

- 各サイクル末に retrospective を必ず残す (今回 3 サイクル分まとめて書いたが、Phase 2 ではサイクル単位で書く)
- pitfalls / wins / improvements の更新を都度行う (Phase 1 では retrospective に集約してしまったが、リアルタイム蓄積の方が将来検索しやすい)

## 良かった点 (Keep)

- **計画 → 実装 → 整理 → 振り返り の流れを 1 ターンに収めた**: 思考の連続性が保たれた
- **既知制約を逐一文書化**: 10 項目の pitfalls 化により、Phase 2 で利用者から指摘される前に把握できた
- **Phase 1 の課題 (項目 7) が早速解消できた**: 着手準備サイクルで Phase 1 残課題を 1 つ消化、Phase 2 本番のサイクル数を実質的に減らせた
- **Salesforce DX 標準仕様への準拠**: `sfdx-project.json` の `packageDirectories` を尊重する設計は、利用者が既存の Salesforce DX 知識をそのまま活かせる

## 課題 (Problem)

- INDEX.md 更新の頻度が高くなってきた → Phase 2 のサイクル末で必ずチェック項目化
- pitfalls/ の Item 10 (CI 未確認) は依然解消していない → Phase 2 サイクル 2-1 の最優先タスク

## 試したいこと (Try)

- Phase 2 サイクル 2-1 を「CI 初回緑化 + Phase 1 リファクタ」の 1 サイクルに絞り、緑が確認できるまで他のサイクルに進まない
- 利用者の現役プロジェクト名を確認する質問を、Phase 2 サイクル 2-8 着手時に明示的に行う

## 蓄積された関連ナレッジ

### 本サイクルで生成
- decisions/[2026-05-07: Phase 2 計画](../decisions/2026-05-07-phase-2-plan.md)
- decisions/[2026-05-07: sfdx-project.json 多パッケージ対応](../decisions/2026-05-07-sfdx-project-multi-package.md)
- pitfalls/[2026-05-07: Phase 1 既知制約 10 項目](../pitfalls/2026-05-07-phase-1-known-limitations.md)
- improvements/[2026-05-07: Phase 1 引き継ぎ改善案 6 項目](../improvements/2026-05-07-phase-1-handover-improvements.md)

### 関連
- [2026-05-07: Phase 1 完了宣言](../decisions/2026-05-07-phase-1-completion.md)
- [2026-05-07: Phase 1 完遂 retrospective](./2026-05-07-phase-1-completion.md)
