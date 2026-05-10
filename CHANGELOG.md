# Changelog

すべての注目すべき変更は本ファイルに記録される (SemVer 準拠)。

## [0.2.1] - 2026-05-11 (セキュリティ Hotfix / v0.3.0 Week 0)

> 機密性の高い実プロジェクトへの導入前監査で検出された **CRITICAL 1 + HIGH 5 + MEDIUM 5 + 推奨 1** の計 12 件を解消。
> v0.3.0 (内部検証実証) 着手前に必須の安全化として、Phase スコープ規律 § 3.2 に従い v0.3.0 Week 0 の範疇で対処。新 Phase は立てていない。

### Security — CRITICAL

- **CRIT-1 (`sfai graph query` の任意 SQL 実行)**:
  - `packages/sfai-core/src/graph/sqlite-store.ts` に `isSafeReadOnlyQuery()` allowlist と `queryUntrusted()` メソッドを追加
  - `cmdGraphQuery` を `new Database(dbPath, { readonly: true })` + SELECT/WITH allowlist の **二重防御** で実行
  - ATTACH DATABASE / multi-statement / コメント隠蔽 INSERT / WITH 内危険構文を全て拒否

### Security — HIGH

- **HIGH-1 (シークレットマスキング未適用)**: `secrets/apply.ts:maskGraphSensitiveFields` を新設、`graph/builder.ts` で `validateGraph` 直前に適用。対象は ValidationRule.errorConditionFormula / errorMessage / CustomMetadataRecord.label / values[].value
- **HIGH-2 (secrets-rules.yaml の ReDoS)**: `secrets/load.ts:compileSafeRegex` で pattern.length 上限 / nested quantifiers 静的検出 / 50ms 実行ベンチマークの三層防御
- **HIGH-3+4 (パストラバーサル)**: `util/path-guard.ts` 新設 (`resolveWithinRoot` / `assertWithinRoot`)。`cli.ts` の `--input` x2、`--target` x1、`explain/index.ts:resolveMarkdownPath` の `fqn` 経路に適用
- **HIGH-5 (git ref インジェクション)**: `diff/git.ts:assertSafeGitRef` で `-` 始まり拒否 + 文字許容パターン + git option 名パターンの明示拒否

### Security — MEDIUM

- **MED-1**: `fast-xml-parser` を `^4.5.0` → `^5.7.3` (CVE 解消)
- **MED-2**: `explain/index.ts:sanitizeBlockBody` で `MARKER_FRAGMENT_PATTERN` を strip し、AI 出力経由のブロック構造攻撃を無害化
- **MED-3**: `scaffold/.claude/commands/sfai-explain.md.eta` に shell-side FQN 文字検証 (`case ... in *[!A-Za-z0-9_.-]*`) を追加
- **MED-4**: `util/walk.ts` を `lstatSync` + `isSymbolicLink()` skip に変更し、`force-app/` 外部への symlink 経由のメタデータ混入を防止
- **MED-5**: `.gitignore` に `.claude/settings.local.json` を追加 (将来の絶対パス漏洩防止)

### Security — Defense in Depth

- `graph/parse-xml.ts` の `XMLParser` に `processEntities: false` を明示 (XXE 防御の表明)
- `sqlite-store.ts:assertSafeIdentifier` + `ALLOWED_TABLES_FOR_MIGRATE` で migrate 経路の SQL identifier を allowlist 化

### Verified

- 256 テスト全 pass を維持 (1 件のテストは MED-2 の新挙動に合わせて更新)
- `security-reviewer` agent による独立再監査で **CONDITIONAL GO → GO** 判定
- `npm audit`: production 依存の脆弱性 0 件 (残存 5 件は dev-only vitest/vite/esbuild)

### 規律遵守の記録

本リリースは [Phase スコープ規律 ADR](./.agents/knowledge/decisions/2026-05-10-scope-discipline-and-phase-restructure.md) と [v0.3.0 着手 ADR](./.agents/knowledge/decisions/2026-05-10-v0.3.0-internal-validation-plan.md) の Week 0 タスク B (pitfalls 解消) として処理した。**新 Phase は立てず、v0.3.0 内で責任を持って対処** という規律 §3.2 を初実例として実行した。

---

## [0.2.0] - 2026-05-10 (Pre-release / 内部検証 拡充フェーズ完了)

> **本リリースは 2026-05-08 〜 05-09 に「Phase 7〜15」として連鎖実装された 9 個の派生 Phase を、本来 1 つの Phase として完結すべきだった「ドキュメント完全化 + AI 文面生成基盤」テーマとして統合したもの**である ([scope-discipline-and-phase-restructure ADR](./.agents/knowledge/decisions/2026-05-10-scope-discipline-and-phase-restructure.md))。
> 同 ADR で `AGENTS.md` § 3「Phase スコープ規律」と禁則 14「Phase の安易な増殖禁止」を恒久ルール化し、再発を防止する。

### Added — ドキュメント完全化 (Apex / Flow / Trigger / 周辺メタデータ 21 種)

- **対応メタデータ種を 21 種まで拡張** (旧 Phase 7-A 〜 12 経由):
  - 既存: ApexClass / ApexTrigger / Flow / PermissionSet / Profile / ValidationRule / RecordType / GlobalValueSet
  - 新規: ApprovalProcess / SharingRules / Layout / FlexiPage / CustomMetadataType / NamedCredential / RemoteSiteSetting / LWC / Aura / VFP / VFC / CustomApplication / その他
- 各エンティティに対する `docs/generated/` Markdown 描画 (3 種ブロック構造を全面適用)
- 横断ドキュメント:
  - ER 図 (Mermaid)
  - 自動化マトリクス (オブジェクト × Trigger/Flow/Workflow)
  - 権限マトリクス (PermissionSet/Profile × Object/Field × CRUD/FLS)
  - 依存グラフ + ヘルスレポート
- 上層部資料 4 種:
  - Executive Summary (CEO/CIO/事業責任者向け)
  - Architecture Overview
  - Security & Compliance Posture
  - Risk & Change Impact Board

### Added — 処理フロー可視化 (旧 Phase 8 / 9 / 9.x / 13)

- メソッド単位 / Flow 単位の Mermaid フロー図
- Mermaid ノード詳細表 (各ノードの操作内容)
- 全 6 エンティティ Quick Summary
- ValidationRule / 条件式の自然語化
- ApprovalProcess の取り込み + Sharing Rules + PermissionSet 権限マトリクス
- 設計書に「処理概要セクション」「処理詳細セクション」を追加 (Apex / Flow / Trigger)
- Markdown 表崩れ修正 (`postProcessMarkdown`)

### Added — AI 文面生成基盤 (旧 Phase 14 / 15)

- `/sfai-explain` を **10 種の ExplainKind に拡張** (narrative / business-scenario / key-design-decisions / processing-overview-narrative / processing-details-narrative / operational-notes / summary / business-domain / concerns / その他)
- **Block ID Registry** (`block-registry.ts`) による早期 typo guard
- `scaffold/.claude/commands/sfai-explain.md.eta` / `scaffold/.claude/agents/explain-writer.md.eta`
- AI_MANAGED ブロックの保全 merge 規則 (`sfai sync` 再実行で書き戻し内容を破壊しない)
- **5 エンティティ × 21 ブロックを実 AI 推論で書き戻し end-to-end 検証成功** (旧 Phase 15)

### Changed — 規律と計画の整流化

- リリース計画を 3 段階ゴール (内部検証 / 社内展開 / 社外展開) に対応する v0.x.0 体系へ整流化
- `AGENTS.md` に新章「§ 3 Phase スコープ規律」を追加 (§ 番号を 3〜7 → 4〜8 へ再採番)
- `IMPLEMENTATION_GUIDE.md`:
  - 「実装フェーズ一覧」をリリース計画ベースに再構成
  - 旧「Phase 7: 普及フェーズ」を **v0.3.0 内部検証実証 + v0.4.0+ 社内展開 + v1.0.0+ 社外展開** に分割
  - 禁則 14「Phase の安易な増殖禁止」を追加
- `README.md`: 内部検証完了の DoD (5 項目) を明示、ライセンス記述を Apache 2.0 確定に更新
- 既存ナレッジ (`.agents/knowledge/decisions/Phase 1〜15`) は履歴として保全 (改竄しない)

### Verified

- v0.2.0 構成要素: 旧 sfai-trial で 21 メタデータ種対応・**256 テスト pass** (旧 Phase 14 完了時) を維持
- 実 AI 推論による設計書 end-to-end 検証: 5 エンティティ × 21 ブロックで `updated=21 skipped=0`、`sfai sync` 再実行後も全保全
- 3 層分離 (DETERMINISTIC / AI_MANAGED / HUMAN_MANAGED) を全エンティティで保全

### Known Limitations (v0.3.0 で対処予定)

- `method-summary-table` がインライン SOQL `[SELECT ...]` を検出しない ([pitfalls](./.agents/knowledge/pitfalls/2026-05-09-method-summary-table-soql-detection.md))
- `explain-writer` 改善 4 件 (ソース参照オプトイン / dry-run mode / 文例追加 / kind 自動判定)
- 再現性 CI (温度 0 / プロンプトハッシュ / N-run 一致)
- 大量エンティティへの一括 explain-write
- LWC / Aura / FlexiPage / VFP / VFC / Lightning App の AI 推論検証

### Known Limitations (v1.0.0 までに対処)

- DX MCP Server 実接続 (Beta 仕様 GA 待ち)
- Permission Set / Profile の詳細権限抽出
- Fine-grained 増分ビルド (現状 incremental は全件書き戻し)
- Windows パス区切り対応
- i18n (英訳)
- Antigravity プラットフォーム実機検証

---

## [0.1.0] - 2026-05-08 (Pre-release / 内部検証 基盤フェーズ完了)

### Added — Phase 1〜6 までの全機能

#### Phase 1: 知識グラフ + CLI 基盤
- `sfai graph build` (force-app/ → SQLite)
- `sfai graph query` (SQL クエリ)
- `sfai graph schema` (JSON Schema 出力)
- `sfai render system-index/objects` (Markdown 派生物)
- `sfai validate` (グラフ検証)
- `sfai version`
- HUMAN_MANAGED ブロックのマージアルゴリズム (6 テストケース)
- メタデータ機密性分類 + マスキング (`secrets-rules.yaml`)
- LocalSourceAdapter + sfdx-project.json packageDirectories 対応

#### Phase 2: Claude Code 統合
- `scaffold/CLAUDE.md.eta` / `AGENTS.md.eta`
- 3 種 subagent (graph-querier / object-documenter / onboarding-guide)
- 3 種 slash command (`/onboard` / `/explain` / `/impact`)
- hooks (`PostToolUse(force-app/**)`)
- `sfai metrics record/show` (AI コスト計測)

#### Phase 2.5: CLI UX 改善
- `sfai init --bootstrap` (1 コマンド初回セットアップ)
- `sfai sync` (1 コマンド日常運用)
- `sfai render` 引数省略で全描画

#### Phase 3: 差分意味づけ
- `sfai diff` (Git 差分の決定的検出 + 7 カテゴリ分類)
- change_summary スキーマ + `Tracked<T>` (source 列必須化)
- 5 種 並列分類 subagent (data-model / automation / permission / ui / logic)
- `/classify-diff` slash command
- 一致率 CI 基盤 (`runConsistencyCheck` + `expectMatchRate`)
- Code Analyzer SARIF 取り込み (`--include-static-analysis`)
- `/change-summary` slash command

#### Phase 4: 手動作業管理 + リリース準備
- manual_step / release_doc スキーマ + ajv 強制
- `extractManualSteps` (ルールベース、5 パターン検出)
- 3 種 subagent (manual-step-extractor / release-composer / rollback-drafter)
- `/release-prep` / `/manual-steps` slash command

#### Phase 5: オンボーディング本格化
- `.sfai/context-map.yaml` (4 persona × 任意ドメイン定義)
- `.sfai/onboarding-state.json` (gitignore、進捗記録)
- 4 persona 別 subagent:
  - onboarding-guide (new_joiner)
  - review-assistant (reviewer)
  - release-advisor (release_manager)
  - customer-impact-explainer (customer_facing)
- FAQ 抽出 + PII フィルタ (secrets/mask 再利用)
- `sfai onboard {context, state, faq}` CLI

#### Phase 6: Plugin 化 + アダプタ拡張
- `claude-plugin/plugin.json` (Claude Code Plugin 形式)
- `adapters/dx-mcp/` stub (DX MCP Server アダプタ、Phase 7 で本実装)
- 3 profile (minimal / standard / full) 定着
- npm 公開準備 (CHANGELOG / SECURITY 拡充)
- `examples/sample-project/` 充実

### Verified

- Phase 2 検証ゲート: 利用者の Dev Edition で `/onboard` `/explain` 動作確認
- Phase 3 検証ゲート: sfai-trial で 3 並列 classifier 動作 (44 秒、分類精度 100%)
- Phase 4 検証ゲート: sfai-trial で v0.0.0→v0.1.0 リリース準備完走 (4 件手動作業を漏れなく検出)
- Phase 5 検証ゲート: 4 persona subagent + context-map + state + FAQ 全機構動作

### Known Limitations (Phase 7 で対応)

- DX MCP Server 実接続 (Beta 仕様 GA 待ち)
- Permission Set / Profile の詳細権限抽出
- LWC / Aura / Visualforce 構造解析 (現状はメタデータ取り込みのみ)
- Fine-grained 増分ビルド (現状 incremental は全件書き戻し)
- Windows パス区切り対応
- 一致率 CI 実 AI 統合
- i18n (英訳)
- Antigravity プラットフォーム実機検証

## [Pre-0.1.0]

Phase 1 着手前の準備期間 (2026-05-06 〜 2026-05-07):
- README / CLAUDE / AGENTS / IMPLEMENTATION_GUIDE 確立
- メタ層 vs 配布物層の物理分離 (`scaffold/`)
- Apache License 2.0 確定
- ナレッジ蓄積機構 (`.agents/knowledge/`) 立ち上げ
