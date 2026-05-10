---
type: retrospective
date: 2026-05-07
cycle: Phase 1 着手前準備 + scaffold 初版 + eta 規則 ADR + Phase 1 着手 (4 サイクル統合)
phase: Phase-1 (kickoff)
tags: [bootstrap, license, scaffold, eta, sfai-core, json-schema, human-managed-merge]
---

# Retrospective: 統合 (4 サイクル)

## サイクル要約

ユーザ承認のもと、振り返り候補 1〜4 を順次実行した:

1. **着手前準備**: LICENSE (Apache 2.0)、NOTICE、SECURITY.md、CONTRIBUTING.md、ルート `package.json` (monorepo workspaces) を整備
2. **scaffold 初版**: `scaffold/CLAUDE.md.eta` `scaffold/AGENTS.md.eta` `scaffold/.gitignore` `scaffold/.claude/settings.json.eta` `scaffold/.agents/knowledge/INDEX.md` ほか、利用者プロジェクト向けひな型の最初のドラフトを起こした
3. **eta 変数命名規則 ADR**: `it.` ネームスペース + camelCase + 必須 5 変数 + オプション数個を標準セットとして確定
4. **Phase 1 着手**: `packages/sfai-core/` を作成し package.json / tsconfig / vitest / biome / 型定義 / 知識グラフ JSON Schema を整備、`HUMAN_MANAGED マージアルゴリズム ADR` を 6 テストケース込みで本書化、ゴールデンテストのディレクトリ骨格を配置

新規 ADR 2 件 (eta 変数規則 / HUMAN_MANAGED マージ)、新規ファイル 約 25 件、新規ディレクトリ 約 30 件。

## 1. 要件整理 — 学び

- ユーザ依頼「数字順で着手」は 4 つのサイクルを束ねた指示だが、**各サイクルを独立した責務として分離して実行** したのが正解だった。1 つのサイクルが他に侵食すると振り返りで何が学べたか不明瞭になる
- AGENTS.md の自律ループは「サイクル粒度はコミット単位より大きく機能単位より小さい、1〜数日で 1 サイクル」と定義したが、今回 1 ターンで 4 サイクルを束ねる運用も成立した。粒度はタスク内容で柔軟に

## 2. 計画立案 — 学び

- サイクル 1 (準備物)、サイクル 2 (scaffold)、サイクル 3 (eta 規則)、サイクル 4 (Phase 1 着手) の **依存順序が自然** だった: 1 が無いとライセンス曖昧、2 が無いと 3 の規則策定根拠が無い、3 が無いと 4 の型仕様で揺れる
- サイクル 4 を「Phase 1 着手」と銘打ったが、実装本体ではなく **スケルトン整備とスキーマ確定** にとどめた判断は正しい。実装は次サイクルで進める

## 3. 実行 — 学び

- LICENSE Apache 2.0 全文を直接ファイルに書き込んだ: 検索回数を減らせた
- `package.json` の `peerDependencies` に sf CLI を宣言したことで、利用者環境の前提が package manifest として明示された
- JSON Schema を **正本**、TypeScript 型を **派生** として位置付けた。将来の自動生成 (json-schema-to-typescript) に開かれた構造
- HUMAN_MANAGED マージ ADR で 6 ケースを明確に分けたことで、Phase 1 の実装スコープが定量化された (テストケース件数 = 進捗バロメータ)

## 4. レビュー — 学び

- scaffold 配下の `.eta` ファイルが `it.projectName` `it.profile` `it.salesforceApiVersion` `it.sfaiVersion` を使用しており、サイクル 3 で確定した変数規則と整合している (回顧で確認)
- `package.json` の `workspaces` 配列が `packages/*` のみで、`scaffold/` `claude-plugin/` `examples/` は対象外。意図的な選択だがドキュメントに明示しておくべきだった → 改善余地

## 5. 修正・再実装 — 学び

- 大きな手戻りなし
- ただしサイクル 4 で `tests/golden/render/case-N/` のディレクトリ作成時に `.gitkeep` を入れたが、後で `input/` `expected/` 中身を実装するとき空判定で迷う可能性 → Phase 1 実装時に注意

## 6. 整理 — 学び

- ルート `README.md` のドキュメント構成表 (前サイクルで更新) と、本サイクルで追加した `LICENSE` `NOTICE` `SECURITY.md` `CONTRIBUTING.md` `package.json` の **整合チェック未実施**。次サイクルで反映が必要 → 課題提起へ
- `IMPLEMENTATION_GUIDE.md` 付録の Phase 1 着手前チェックリストにある項目のうち、本サイクルで満たせたもの: LICENSE (Apache 2.0)、`package.json` 雛形、knowledge/templates 理解。未満たしのもの: 対象 Salesforce サンプル組織、Claude Code 動作環境、CI 基盤方針

## 7. 課題提起 — 次サイクルへの種

### 短期 (次の 1〜2 サイクルで)

- [ ] **ルート README.md の構成表に LICENSE / NOTICE / SECURITY.md / CONTRIBUTING.md / package.json を追記** (ドキュメント整合)
- [ ] **`tests/golden/render/case-1〜6/` の input/expected を実装** — HUMAN_MANAGED マージ ADR 仕様に従って具体的な Markdown ファイルペアを配置
- [ ] **`packages/sfai-core/src/merge/` の実装** — まず Case 1 (新規ファイル) と Case 6 (マーカー破損検出) から、TDD で
- [ ] **CI 基盤方針** — GitHub Actions のワークフロー雛型 (`.github/workflows/ci.yml`)。lint / typecheck / test / coverage の最小セット

### 中期 (Phase 1 完了まで)

- [ ] `LocalSourceAdapter` の実装 — `force-app/` 走査 + `@salesforce/source-deploy-retrieve` 連携
- [ ] グラフビルダー — XML パース → SQLite 投入。registry を直接参照
- [ ] `eta` 描画エンジン — マージロジックと統合
- [ ] `sfai` CLI のコマンド入口
- [ ] **メタデータ機密性分類とマスキング規約** — `secrets-rules.yaml` 雛型と分類ロジック (Phase 1 必須成果物)

### 長期 (Phase 2 以降に持ち越す気づき)

- [ ] `scaffold/` の `.eta` ファイル品質を Phase 6 で再点検 (今回はドラフト)
- [ ] `Tracked<T>` TypeScript ヘルパー (再現性ガバナンス層 2 の補助) は Phase 3 で

## 良かった点 (Keep)

- **4 サイクルを束ねる運用が機能した**: 各サイクルで責務分離、ADR を都度残し、最後に統合振り返り
- **ADR を必須成果物にした効果**: HUMAN_MANAGED マージ ADR が 6 テストケースの形でスコープを定量化、Phase 1 実装の進捗管理が容易に
- **scaffold 初版を「ドラフト」と明記**: Phase 5 / 6 で本格化することを明示し、現時点の品質期待値を下げた (透明性)
- **JSON Schema を正本、TypeScript を派生にした**: 自動生成の道を開きつつ手書きで先行できた
- **CONTRIBUTING.md で自律ループを人間にも要求**: AI と人間の作法を統一、ナレッジ蓄積が両輪で回る前提を確立

## 課題 (Problem)

- ドキュメント間の整合チェックが事後的になりがち (上記「整理」の学び)
- `package.json` workspaces のスコープを明示する場所が無い (現状はメタ層 README の暗黙知)
- AI コスト計測 (`sfai metrics`) の Phase 2 実装が遠い: メタ層では既に多くの decisions / pitfalls / wins を AI で書いているが、コスト計測は無い → メタ層運用の改善余地

## 試したいこと (Try)

- 次サイクルで `.github/workflows/ci.yml` の **最小ワークフロー** を書き、lint / typecheck だけでも CI を回す
- HUMAN_MANAGED マージ Case 1 の golden test を **実装より先に書く** (TDD の RED フェーズ)
- メタ層でも `sfai metrics` 相当の手動コストログを `.agents/knowledge/improvements/` に残す試行 (DX MCP / Claude API のトークン使用統計を意識化)

## 蓄積された関連ナレッジ

### Decisions (本サイクルで新規)
- [2026-05-07 eta 変数命名規則と標準セット](../decisions/2026-05-07-eta-variable-naming-convention.md)
- [2026-05-07 HUMAN_MANAGED マージアルゴリズム仕様](../decisions/2026-05-07-human-managed-merge-algorithm.md)

### Decisions (前サイクル、本サイクルで活用)
- [2026-05-06 プロジェクト基盤の初期構築](../decisions/2026-05-06-bootstrap-project-foundation.md)
- [2026-05-07 IMPLEMENTATION_GUIDE.md v1.1 改訂](../decisions/2026-05-07-implementation-guide-revision-v1.1.md)
- [2026-05-07 Apache 2.0 確定](../decisions/2026-05-07-license-apache-2.0.md)
- [2026-05-07 eta 確定](../decisions/2026-05-07-template-engine-eta.md)
- [2026-05-07 DX MCP アダプタ層](../decisions/2026-05-07-dx-mcp-adapter-pattern.md)
- [2026-05-07 Code Analyzer SARIF](../decisions/2026-05-07-code-analyzer-sarif-integration.md)
- [2026-05-07 source 列必須化](../decisions/2026-05-07-source-column-three-layer-boundary.md)
- [2026-05-07 メタ層 vs 配布物層 物理分離](../decisions/2026-05-07-meta-vs-distribution-layer-separation.md)

### Pitfalls
- 本サイクルでは無し (実装が始まれば現れる想定)

### Wins
- 本サイクルでは無し (具体的な手応えは Phase 1 実装後に)

### Improvements
- 本サイクルでは無し
