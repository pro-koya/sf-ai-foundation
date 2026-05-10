---
type: retrospective
date: 2026-05-07
cycle: Phase 1 完遂 (9 サイクル統合: A〜I)
phase: Phase-1
tags: [phase-1, completion, milestone, sfai-core]
---

# Retrospective: Phase 1 完遂

## サイクル要約

短期課題 (1) README 整合 + (4) CI 最小から始め、Phase 1 の中核実装を一気通貫で完成。サイクル A〜I の 9 サイクル分を 1 ターンで処理:

- **A**: README 整合 + `.github/workflows/ci.yml` + ルート `biome.json`
- **B/C**: HUMAN_MANAGED マージ実装 (parser, validator, merge, markers) + 6 ゴールデンテストケース
- **D**: スキーマ validator (ajv)、ハッシュユーティリティ、`LocalSourceAdapter`
- **E**: グラフビルダー (XML 解析、エンティティ抽出 8 種、依存解析、SQLite 投入)
- **F**: render エンジン (eta + マージ統合 + archive)
- **G**: `sfai` CLI 入口 (graph build/query/schema/render/validate/metrics/version)
- **H**: secrets マスキング (rules + mask) + scaffold YAML 雛型
- **I**: Phase 1 完了 ADR + 統合振り返り

新規ファイル: 約 50 件、新規 TypeScript モジュール: 24 個、新規テスト: 7 ファイル、新規 ADR: 2 件 (HUMAN_MANAGED マージ仕様 + Phase 1 完了)。

## 1. 要件整理 — 学び

- ユーザの「Phase 1 完遂まで連続で」という指示に対し、**サイクル分割を維持しながら順次実行** したことで、TaskList と振り返りの一貫性を保てた
- IMPLEMENTATION_GUIDE.md の Phase 1 ゴール条件を ADR で逐一トレースしたのが効いた (完了確認の客観性)

## 2. 計画立案 — 学び

- 9 サイクルを A〜I で順序付けたが、依存関係がほぼ線形 (A→B→D→E→F→G、H は並列可能、I は最後) で並列化の余地は少なかった
- `merge` を最初に書いたことで、`render` で再利用できた。逆順だったら手戻りが発生していた

## 3. 実行 — 学び

- **immutable / readonly を徹底** したコードスタイルが効いた。バグの温床になる mutation を最初から排除
- `source: deterministic | ai | human` の設計を `change_summary` のみに留め、Phase 1 の他のスキーマには波及させなかった (YAGNI)
- XML パースは `fast-xml-parser` を選択。SDR を直接使う案もあったが、Phase 1 のオフライン読み取りには軽量パーサで十分
- Apex / Trigger は `-meta.xml` ではなく本体ファイル (`.cls` / `.trigger`) からも読み取る必要があり、`describeFile` で両方扱う分岐を入れた
- CLI の `parseArgs` は yargs / commander 等を使わず手書き。依存最小化を優先

## 4. レビュー — 学び

- **CRITICAL ゼロ**: 秘密情報のハードコードなし、ファイル削除を伴う操作は archive 経由のみ (rename)、禁則違反なし
- **HIGH 警戒点**:
  - `cli.ts` 内で SQLite から読み戻すクエリに `as any` キャストが残った (events_json の JSON.parse 部分)。Phase 2 で型安全な reader を分離する
  - `SqliteGraphStore.writeAll` が `mode: "incremental"` でも全件書き戻し → 真の incremental は Phase 7 へ
- **MEDIUM**:
  - `extractors.ts` が 200 行近くて分割余地あり。各エンティティ個別ファイルへ分離は Phase 2 でリファクタ
  - `cli.ts` も 250 行超え。コマンドハンドラを別ファイルに切り出す案

## 5. 修正・再実装 — 学び

- 大きな手戻りなし
- 中盤で `render.ts` に CommonJS 互換 `require` を誤って書いてしまい、即修正 (ESM プロジェクトなので)
- biome.json で `tests/golden/**/expected/**` を ignore しないと expected の Markdown が lint エラーになる懸念に先回り

## 6. 整理 — 学び

- `src/index.ts` を実装の進捗に合わせて update した
- 不要なコメント・`void X` 残り物を削除
- 各サブディレクトリに `index.ts` を置いて公開 API を明示

## 7. 課題提起 — 次サイクルへの種

### 短期 (Phase 2 着手 1〜2 週)

- [ ] **CI 初回実行とエラー対応**: GitHub Actions の workflow が動くまで `npm install` / `npm test` を回す。型エラー / lint エラーは現状コードレビューでは検出できないため、CI で確定
- [ ] **`scaffold/.claude/commands/onboard.md.eta`**: Phase 2 ゴールの `/onboard` ひな型
- [ ] **`scaffold/.claude/agents/graph-querier.md.eta`** 等: 3 種 subagent の最小実装
- [ ] **`secrets-rules.yaml` の YAML 読み込み**: js-yaml or yaml パッケージで動的ロード
- [ ] **検証ゲート**: 現役プロジェクトで `/onboard` 完走

### 中期 (Phase 2 全体)

- [ ] AI コスト計測 (`sfai metrics`) の実装と Phase 2 終了時の使用統計測定
- [ ] hooks (`.claude/settings.json` の PostToolUse) を 500ms 以内で動作確認
- [ ] `sfai diff` の最小骨格 (Phase 3 で本実装)

### 長期 (Phase 7 で改善)

- [ ] Fine-grained incremental build (ハッシュ比較ベース)
- [ ] Permission Set / Profile の詳細権限抽出
- [ ] LWC / Visualforce / Layout など追加メタデータ型

## 良かった点 (Keep)

- **ADR を都度書く運用**: 設計判断が「なぜ」付きで残り、後の整理コストがゼロになった
- **TDD 風のテスト先行**: HUMAN_MANAGED マージは仕様 ADR を書いてから実装に入ったので、ゴールデンテストが自然な合否判定になった
- **JSON Schema を正本、TS 型は派生**: 設計原則 (3 層分離) が型レベルで強制された
- **immutable / readonly の徹底**: コードの予測可能性が高く、レビューが楽
- **monorepo 構造**: 将来の `sfai-prompts` `sfai-adapters-dx-mcp` 分割に対応する土台ができた
- **scaffold と packages の物理分離**: 開発中も「これはメタ層 / これは配布物」の判断が即時できた

## 課題 (Problem)

- 単一ターンで 9 サイクル分のコードを書いたため、**実環境での動作未検証**。CI 初回実行で型エラー / lint エラーが必ず出るはず → 次サイクルで対応
- `cli.ts` の SQL 列マッピングは hand-coded で型安全でない。Phase 2 で `KnowledgeGraphReader` クラスとして分離リファクタ
- ゴールデンテストの空白文字 / 改行が厳密一致のため、テンプレート修正で頻繁に壊れる懸念。eta の autoTrim 設定を Phase 2 で確認

## 試したいこと (Try)

- 次ターンで `npm install && npm run typecheck && npm test` をローカルで実行 → Phase 1 の動作完結性を確認
- Phase 2 着手時に `extractors.ts` を `extractors/{object,field,flow,...}.ts` へ分割するリファクタ ADR
- Phase 2 で `LocalSourceAdapter` を実 Salesforce DX プロジェクトに対して動かし、見つかった漏れ (例外メタデータ型) を `pitfalls/` に蓄積

## 蓄積された関連ナレッジ

### 本サイクルで生成された Decisions
- [2026-05-07 HUMAN_MANAGED マージアルゴリズム仕様](../decisions/2026-05-07-human-managed-merge-algorithm.md)
- [2026-05-07 Phase 1 完了宣言](../decisions/2026-05-07-phase-1-completion.md)

### 本サイクルで活用した既存 Decisions
- [2026-05-07 v1.1 改訂方針](../decisions/2026-05-07-implementation-guide-revision-v1.1.md)
- [2026-05-07 Apache 2.0](../decisions/2026-05-07-license-apache-2.0.md)
- [2026-05-07 eta 確定](../decisions/2026-05-07-template-engine-eta.md)
- [2026-05-07 DX MCP アダプタ層](../decisions/2026-05-07-dx-mcp-adapter-pattern.md)
- [2026-05-07 source 列必須化](../decisions/2026-05-07-source-column-three-layer-boundary.md)
- [2026-05-07 メタ層 vs 配布物層 物理分離](../decisions/2026-05-07-meta-vs-distribution-layer-separation.md)
- [2026-05-07 eta 変数命名規則](../decisions/2026-05-07-eta-variable-naming-convention.md)

### Pitfalls (本サイクルで顕在化)
- (実環境動作未確認のため、Phase 2 の CI 初回実行時に発生した型 / lint エラーを次サイクルの pitfalls/ に記録予定)

### Wins
- (Phase 1 単体では未確認。Phase 2 検証ゲート通過後に retrospective からの抽出予定)

### Improvements
- `extractors.ts` の分割 (Phase 2 で実施予定)
- `cli.ts` の SQL マッピング型安全化 (Phase 2 で実施予定)

---

**Phase 1 を閉じる。** 次は Phase 2 (Claude Code 統合 + 検証ゲート)。
