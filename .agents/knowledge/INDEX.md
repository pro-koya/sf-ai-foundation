# Knowledge Index

> AI 自律ループが蓄積した知見の索引。新しいエントリを追加したら、この INDEX に **1 行サマリ** を追記すること。

---

## 使い方

新しいタスクに着手する前に、関連カテゴリの一覧をスキャンする。

| カテゴリ | 入口 | 何を見るか |
|---|---|---|
| Decisions | [`decisions/`](./decisions/) | 過去の設計判断・トレードオフ・採用理由 |
| Pitfalls | [`pitfalls/`](./pitfalls/) | 既知のつまずき・不具合・誤解しやすい点 |
| Wins | [`wins/`](./wins/) | 効いたパターン・再利用したい工夫 |
| Improvements | [`improvements/`](./improvements/) | 改善した点・次に試したい改善 |
| Retrospectives | [`retrospectives/`](./retrospectives/) | サイクル単位の振り返り (時系列) |

---

## Decisions

<!-- 新規追加時はこの下に `- [YYYY-MM-DD: タイトル](decisions/file.md) — 1 行サマリ` を追加 -->

- [2026-05-06: プロジェクト基盤の初期構築](decisions/2026-05-06-bootstrap-project-foundation.md) — README/CLAUDE/AGENTS と `.claude/` `.agents/knowledge/` を整備し、自律ループとナレッジ蓄積の土台を確立
- [2026-05-07: IMPLEMENTATION_GUIDE.md v1.1 改訂方針](decisions/2026-05-07-implementation-guide-revision-v1.1.md) — コンセプト整合・3 セグメント・再現性・公式エコ統合・検証ゲートの 6 本柱で改訂
- [2026-05-07: ライセンスを Apache 2.0 に確定](decisions/2026-05-07-license-apache-2.0.md) — Phase 1 着手前に確定、特許条項あり、企業利用に親和的
- [2026-05-07: テンプレートエンジンを eta に確定](decisions/2026-05-07-template-engine-eta.md) — 軽量・TS 親和、3 種ブロック挿入をヘルパーで実装
- [2026-05-07: DX MCP Server はアダプタ層として後付け統合](decisions/2026-05-07-dx-mcp-adapter-pattern.md) — Phase 6 で `adapters/dx-mcp/` 実装、Beta 仕様変動に耐える独立性を確保
- [2026-05-07: Code Analyzer v5 の SARIF を差分分類器の入力に](decisions/2026-05-07-code-analyzer-sarif-integration.md) — 静的解析は公式に委譲、本 OSS は業務影響に集中
- [2026-05-07: スキーマに source 列 (deterministic/ai/human) を必須化](decisions/2026-05-07-source-column-three-layer-boundary.md) — 3 層分離の境界をスキーマレベルで強制、再現性検証の基盤に
- [2026-05-07: メタ層と配布物層をディレクトリで物理分離](decisions/2026-05-07-meta-vs-distribution-layer-separation.md) — ルート直下=メタ、`scaffold/`=配布物。判別ルール明文化と禁則 12/13 派生
- [2026-05-07: scaffold/ の eta 変数命名規則と標準セット](decisions/2026-05-07-eta-variable-naming-convention.md) — `it.` ネームスペース + camelCase。必須 5 変数 + オプション数個を確定
- [2026-05-07: HUMAN_MANAGED マージアルゴリズム仕様](decisions/2026-05-07-human-managed-merge-algorithm.md) — 3 種ブロックのマーカー仕様、リネーム / 削除 / 破損対応、ゴールデンテスト 6 ケース
- [2026-05-07: Phase 1 完了宣言](decisions/2026-05-07-phase-1-completion.md) — sfai-core の中核実装完了、ゴール条件全項目を達成、検証ゲートは Phase 2 へ
- [2026-05-07: Phase 2 着手計画](decisions/2026-05-07-phase-2-plan.md) — 8 サイクル分割 (2-1〜2-8)、検証指標 5 項目、検証ゲートは最終に配置
- [2026-05-07: sfdx-project.json 多パッケージ対応](decisions/2026-05-07-sfdx-project-multi-package.md) — packageDirectories の 3 段フォールバック、Phase 1 残課題を解消
- [2026-05-07: Phase 2 サイクル 2-1 完了](decisions/2026-05-07-cycle-2-1-completion.md) — extractors 8 分割 / KnowledgeGraphReader 抽出 / secrets-rules YAML 読み込み / apiVersion meta.xml 抽出 / tsconfig 調整
- [2026-05-07: Phase 2 完了宣言](decisions/2026-05-07-phase-2-completion.md) — 全ゴール条件達成、検証ゲート通過、UX 課題を Phase 2.5 で対応する方針確定
- [2026-05-07: Phase 3 着手計画](decisions/2026-05-07-phase-3-plan.md) — 差分意味づけと自動化、8 サイクル + Phase 2.5 (UX) 前提、再現性ガバナンス本格稼働
- [2026-05-07: Phase 2.5 完了宣言 (CLI UX 改善)](decisions/2026-05-07-phase-2-5-completion.md) — `sfai init --bootstrap` / `sfai sync` / `sfai render` 引数省略で 4→1 コマンド統合、後方互換維持
- [2026-05-07: Phase 3 構造的完了 (3-1〜3-7)](decisions/2026-05-07-phase-3-completion.md) — sfai diff / change_summary + Tracked&lt;T&gt; / 5 並列 classifier / 一致率 CI 枠組み / SARIF 取り込み / change-summary。検証ゲート 3-8 は利用者検証へ
- [2026-05-07: Phase 4 計画](decisions/2026-05-07-phase-4-plan.md) — 手動作業管理 + リリース準備、7 サイクル分割、検証ゲート設計
- [2026-05-07: Phase 4 完了宣言](decisions/2026-05-07-phase-4-completion.md) — sfai-trial で v0.0.0→v0.1.0 リリース完走、release_doc 6 セクション + 4 件手動作業を漏れなく検出
- [2026-05-08: Phase 5 計画](decisions/2026-05-08-phase-5-plan.md) — オンボーディング本格化、6 サイクル分割、4 persona 別読み順 / state / FAQ
- [2026-05-08: Phase 5 完了宣言](decisions/2026-05-08-phase-5-completion.md) — context-map / state / FAQ + 4 persona subagent、sfai-trial で 4 機構実機動作確認
- [2026-05-08: Phase 6 計画](decisions/2026-05-08-phase-6-plan.md) — Plugin 化 + DX MCP アダプタ + sample-project + Antigravity 互換、7 サイクル分割
- [2026-05-08: Phase 6 完了宣言](decisions/2026-05-08-phase-6-completion.md) — claude-plugin / DX MCP stub / docs / sample-project 充実、2 環境で `sfai init --bootstrap` 完走
- [2026-05-08: Phase 7 計画](decisions/2026-05-08-phase-7-plan.md) — 資料とソースの乖離を解消、上層部資料も含む 5 サブフェーズ (7-A〜7-E) 計 25 サイクル
- [2026-05-08: Phase 7-A 完了](decisions/2026-05-08-phase-7-a-completion.md) — Flow/Apex/Trigger/PermissionSet/Profile/ValidationRule の Markdown 化、sfai-trial で 43 ファイル/1 コマンド再生成
- [2026-05-08: Phase 7 完了](decisions/2026-05-08-phase-7-completion.md) — Apex/Flow/Trigger 設計書化 / Mermaid フロー図 / RecordType 取り込み / 自動懸念検出 / 上層部資料、sfai-trial で 49 ファイル/127 テスト pass
- [2026-05-08: Phase 8 計画](decisions/2026-05-08-phase-8-plan.md) — 処理フロー可視化 (B 決定的) と AI_MANAGED 安全更新 (A LLM) のハイブリッド、7 サブフェーズ
- [2026-05-08: Phase 8 完了](decisions/2026-05-08-phase-8-completion.md) — メソッド単位 / Flow 単位 Mermaid + `/sfai-explain` 安全更新経路 + AI_MANAGED 保全 merge 規則、169 テスト pass
- [2026-05-08: Phase 9 計画](decisions/2026-05-08-phase-9-plan.md) — 途切れ解消 + Quick Summary + 条件式自然語化、ApprovalProcess/SharingRules は 9.x 後続
- [2026-05-08: Phase 9 完了](decisions/2026-05-08-phase-9-completion.md) — Mermaid ノード詳細表 + 全 6 エンティティ Quick Summary + ValidationRule 自然語化、196 テスト pass
- [2026-05-08: Phase 9.x 完了](decisions/2026-05-08-phase-9-x-completion.md) — ApprovalProcess + SharingRules 取り込み + PermissionSet 権限マトリクス、11 種対応・209 テスト pass・sfai-trial 53 ファイル
- [2026-05-08: Phase 10 計画](decisions/2026-05-08-phase-10-plan.md) — Profile body / Layout / CustomMetadata / NamedCredential 4 サブ。LWC/Aura は Phase 11 に
- [2026-05-08: Phase 10 完了](decisions/2026-05-08-phase-10-completion.md) — 上記 4 種を完成、シークレット非開示パターン確立、15 種対応・214 テスト pass・sfai-trial 60 ファイル
- [2026-05-08: Phase 11 着手計画](decisions/2026-05-08-phase-11-plan.md) — モダン UI レイヤ取り込み (LWC / Aura / FlexiPage)、3 サブで段階的に追加
- [2026-05-08: Phase 11 完了](decisions/2026-05-08-phase-11-completion.md) — LWC bundle 多ファイル取り込み + Aura 軽量取り込み + FlexiPage 取り込み、18 種対応・226 テスト pass・sfai-trial 66 ファイル
- [2026-05-08: Phase 12 着手計画](decisions/2026-05-08-phase-12-plan.md) — 設計書としての本物化 (路線 D: AI_MANAGED 拡充) + Visualforce/Lightning App 取り込み (路線 B) + ER 図
- [2026-05-09: Phase 12 完了](decisions/2026-05-09-phase-12-completion.md) — narrative/business-scenario 等の新 AI_MANAGED ブロック追加 + VFP/VFC/CustomApplication 取り込み + ER 図、21 種対応・235 テスト pass・sfai-trial 69 ファイル
- [2026-05-09: Phase 13 着手計画](decisions/2026-05-09-phase-13-plan.md) — 設計書に処理概要・処理詳細セクションを追加 (Apex/Flow/Trigger)、決定的表 + Mermaid + AI_MANAGED 自然言語の 3 層構成
- [2026-05-09: Phase 13 完了](decisions/2026-05-09-phase-13-completion.md) — メソッド統合表 + クラス内呼出 Mermaid + Flow 実行シーケンス表 + Trigger 統合サマリ表 + 4 ブロックの processing-narrative 追加 + Markdown 表崩れ修正 (postProcessMarkdown)、246 テスト pass
- [2026-05-09: Phase 14 着手計画](decisions/2026-05-09-phase-14-plan.md) — `/sfai-explain` を 10 種の ExplainKind に拡張 + Block ID Registry + scaffold slash command/subagent
- [2026-05-09: Phase 14 完了](decisions/2026-05-09-phase-14-completion.md) — ExplainKind 3→10 種拡張 + block-registry.ts + 早期 typo guard + scaffold/.claude/{commands,agents}/ に sfai-explain.md.eta / explain-writer.md.eta、sfai-trial で 3 エンティティ × 12 ブロック書き込み + 保全検証 完了、256 テスト pass
- [2026-05-09: Phase 15 着手計画](decisions/2026-05-09-phase-15-plan.md) — `/sfai-explain` の実 AI 推論 end-to-end 検証 (5 エンティティ × DETERMINISTIC のみを材料に AI 文面生成 → 書き戻し)
- [2026-05-09: Phase 15 完了](decisions/2026-05-09-phase-15-completion.md) — 5 エンティティ × 21 ブロックを AI 推論で書き戻し成功、`sfai sync` 再実行で全保全、Phase 8 purpose も無傷、`method-summary-table` の SOQL 検出漏れを pitfalls に記録、コード変更ゼロ
- **[2026-05-10: Phase スコープ規律の確立とリリース計画の整流化](decisions/2026-05-10-scope-discipline-and-phase-restructure.md)** — Phase 7〜15 の連鎖追加 (9 個) を反省し、`AGENTS.md` § 3 として Phase スコープ規律を恒久ルール化、旧 Phase 7〜15 を v0.2.0 として統合、本来の北極星「内部検証実証」を v0.3.0 として独立、禁則 14 (Phase 増殖禁止) 追加、内部検証 DoD (5 項目中 3 項目達成) を明示。**今後の Phase 追加は本 ADR の閾値に従う**
- **[2026-05-10: v0.3.0 (内部検証 実証フェーズ) 着手計画](decisions/2026-05-10-v0.3.0-internal-validation-plan.md)** — 規律確立後の最初の Phase。北極星「現参画プロジェクトで価値が届くか実証」/ DoD 5 項目中 3 項目達成 / Out of Scope 明示 (技術拡張は禁止) / Week 0 で SOQL 検出漏れ解消 + 計測フォーマット合意 + ベースライン計測 / 4 週週次運用後に DoD 評価

---

## Pitfalls

<!-- 新規追加時はこの下に `- [YYYY-MM-DD: タイトル](pitfalls/file.md) — 1 行サマリ` を追加 -->

- [2026-05-07: Phase 1 完了時点の既知制約 10 項目](pitfalls/2026-05-07-phase-1-known-limitations.md) — メタデータ型カバレッジ、増分ビルド、Windows パス、CI 未実行など Phase 2 で対応すべき制約
- [2026-05-07: CI / E2E スモークで顕在化した 8 件のバグ (全件修正済)](pitfalls/2026-05-07-ci-and-e2e-bugs.md) — peer dep 自動 install、ES2022 toSorted、Ajv2020、SF ID regex、ディレクトリ vs 拡張子分類、parseTagValue、CLI 引数解析
- [2026-05-07: npm link 経由で sfai が silent 終了するバグ (修正済)](pitfalls/2026-05-07-symlink-isDirectInvoke-bug.md) — isDirectInvoke が symlink resolve していなかった。realpathSync で両側を resolve して比較に修正
- [2026-05-07: 標準オブジェクトの Custom Field で FK 制約失敗 (修正済)](pitfalls/2026-05-07-foreign-key-standard-object-fields.md) — Account/fields/X__c のような典型 DX パターンで FK 失敗。親 object の stub 自動生成で解決
- [2026-05-09: method-summary-table がインライン SOQL `[SELECT ...]` を検出しない](pitfalls/2026-05-09-method-summary-table-soql-detection.md) — `for (... : [SELECT ...])` 形式が SOQL 件数に含まれない。Phase 15 の AI 推論で発覚、Phase 16 候補

---

## Wins

<!-- 新規追加時はこの下に `- [YYYY-MM-DD: タイトル](wins/file.md) — 1 行サマリ` を追加 -->

- [2026-05-07: ダミー Salesforce DX プロジェクトでの E2E スモークテストパターン](wins/2026-05-07-e2e-smoke-test-pattern.md) — `/tmp/sfai-smoke/` に最小構造を作って通し動作を 5 分で確認、ユニットテスト未検出バグを発見
- [2026-05-09: explain-writer の AI 推論 end-to-end が成立した](wins/2026-05-09-explain-writer-end-to-end-validation.md) — Phase 14 の基盤 + scaffold 指針 + registry のおかげで claude-code セッションの AI 推論で 5 エンティティ × 21 ブロックを設計書化、コード変更ゼロ

---

## Improvements

<!-- 新規追加時はこの下に `- [YYYY-MM-DD: タイトル](improvements/file.md) — 1 行サマリ` を追加 -->

- [2026-05-07: Phase 1 → Phase 2 引き継ぎ改善案 6 項目](improvements/2026-05-07-phase-1-handover-improvements.md) — extractors 分割 / SQL 型安全化 / secrets-rules YAML / CI 緑化 / ゴールデンテスト耐性
- [2026-05-07: CLI UX 改善 — コマンド統合](improvements/2026-05-07-cli-ux-consolidation.md) — `sfai init --bootstrap` / `sfai sync` / `sfai render` 引数省略で 4→1 コマンド化
- [2026-05-09: explain-writer 改善 4 件](improvements/2026-05-09-explain-writer-improvements.md) — ソース参照オプション / dry-run / subagent prompt 文例追加 / kind 自動判定

---

## Retrospectives

<!-- 新規追加時はこの下に `- [YYYY-MM-DD: サイクル名](retrospectives/file.md) — 1 行サマリ` を追加 -->

- [2026-05-07: IMPLEMENTATION_GUIDE.md v1.0 → v1.1 改訂](retrospectives/2026-05-07-implementation-guide-revision-v1.1.md) — Phase 1 着手前にコンセプト整合・公式エコ統合・再現性強化を完了。次サイクルは Phase 1 着手準備
- [2026-05-07: メタ層と配布物層の物理分離](retrospectives/2026-05-07-meta-vs-distribution-layer-separation.md) — ルート直下=メタ / `scaffold/`=配布物 でディレクトリ分離。禁則 12/13 追加
- [2026-05-07: 着手前準備 + scaffold 初版 + eta 規則 + Phase 1 着手 (4 サイクル統合)](retrospectives/2026-05-07-foundation-bootstrap-and-phase1-kickoff.md) — LICENSE / scaffold ひな型 / eta 変数規則 / sfai-core スケルトン / HUMAN_MANAGED マージ ADR を整備、Phase 1 実装の助走完了
- [2026-05-07: Phase 1 完遂 (9 サイクル統合 A〜I)](retrospectives/2026-05-07-phase-1-completion.md) — README整合 / CI / マージ実装 / ビルダー / SQLite / render / CLI / secrets / 完了 ADR を一気通貫で完成
- [2026-05-07: Phase 2 着手準備 (3 サイクル統合 J/K/L)](retrospectives/2026-05-07-phase-2-readiness.md) — Phase 2 計画 / sfdx-project.json 対応 / 既知制約と改善案を整理、Phase 2 サイクル 2-1 への申し送り完了
- [2026-05-07: Phase 2 サイクル 2-1](retrospectives/2026-05-07-cycle-2-1.md) — Phase 1 残課題 5 件をコード対応で解消、CI 初回実行のみ持ち越し
- [2026-05-07: Phase 2 サイクル 2-2 / 2-3](retrospectives/2026-05-07-cycle-2-2-and-2-3.md) — scaffold/.claude/{commands,agents}/ に slash commands 3 種・subagents 3 種のひな型を初版作成
- [2026-05-07: Phase 2 サイクル 2-4 〜 2-7](retrospectives/2026-05-07-cycles-2-4-to-2-7.md) — hooks 2秒目標、`sfai metrics` / `sfai init` 実装、sample-project + Dev Edition 検証ガイド
- [2026-05-07: Phase 2 サイクル 2-8 (検証ゲート)](retrospectives/2026-05-07-cycle-2-8-validation-gate.md) — Dev Edition で /onboard /explain 動作確認、CRITICAL 1 件 + HIGH 1 件のバグ抽出と即修正、UX 課題確認
- [2026-05-07: Phase 2.5 (CLI UX 改善)](retrospectives/2026-05-07-phase-2-5.md) — bootstrap / sync / render 省略で 4→1 コマンド、buildAndStore リファクタ、E2E 4 シナリオ全合格
- [2026-05-07: Phase 3 (3-1〜3-7)](retrospectives/2026-05-07-phase-3.md) — diff CLI / Tracked&lt;T&gt; / classifier 5 種 / 一致率 CI / SARIF / change-summary、CI 82/82、検証ゲート 3-8 は利用者検証へ
- [2026-05-07: Phase 3 検証ゲート (3-8)](retrospectives/2026-05-07-cycle-3-8-validation-gate.md) — sfai-trial で意図的 3 ファイル差分 / 3 並列 classifier / change_summary 検証 OK、44 秒で完走
- [2026-05-07: Phase 4 (4-1〜4-7)](retrospectives/2026-05-07-phase-4.md) — manual-step ルール+subagent / release-composer + rollback-drafter / /release-prep + /manual-steps、sfai-trial で v0.1.0 完走
- [2026-05-08: Phase 5 (5-1〜5-6)](retrospectives/2026-05-08-phase-5.md) — context-map / onboarding-state / 4 persona subagent / FAQ + PII フィルタ、sfai-trial で実機検証完走 (CI 101/101)
- [2026-05-08: Phase 6 (6-1〜6-7)](retrospectives/2026-05-08-phase-6.md) — Plugin / DX MCP stub / docs / sample-project / Antigravity 互換、2 環境完走 (CI 107/107)
