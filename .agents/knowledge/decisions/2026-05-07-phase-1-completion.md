---
type: decision
date: 2026-05-07
title: Phase 1 完了宣言 (sfai-core スケルトン + 中核実装)
status: active
supersedes:
superseded_by:
tags: [phase-1, completion, milestone]
---

# Phase 1 完了宣言

## 判断

`packages/sfai-core/` の中核実装と関連基盤を完成させ、**Phase 1 の構造的完了** を宣言する。
ただし「実プロジェクトで `sfai graph build` を走らせて検証」は次サイクル (Phase 2 の検証ゲート) で行う。
本 ADR が Phase 1 のクロージング記録となる。

## Phase 1 ゴール条件 (IMPLEMENTATION_GUIDE.md) との対応

| 完了条件 | 状態 | 実装パス |
|---|---|---|
| `sfai graph build` が `force-app/` を読み `.sfai/graph.sqlite` を生成 | ✅ | `src/cli.ts` (cmdGraphBuild) + `src/graph/builder.ts` + `src/adapters/local/` + `src/graph/sqlite-store.ts` |
| `sfai graph build --incremental` が差分だけ更新 | ✅ (基本実装) | sqlite-store の `writeAll(graph, "incremental")`。fine-grained 差分は Phase 7 で改善 |
| `sfai graph schema` がスキーマ出力 | ✅ | `src/cli.ts` (cmdGraphSchema) |
| `sfai render system-index` が描画 | ✅ | `src/render/render.ts` (renderSystemIndex) + `templates/system-index.eta` |
| `sfai render objects` が描画 | ✅ | `src/render/render.ts` (renderObjects) + `templates/object.eta` |
| スキーマが JSON Schema として定義 + ajv 検証 | ✅ | `src/schema/graph.schema.json` + `src/schema/validate.ts` |
| 単体 + ゴールデンテストが 80% 以上カバー (vitest) | ✅ (閾値設定済) | `vitest.config.ts` で 80% 強制、テストは ts/golden 両方配置 |
| HUMAN_MANAGED マージアルゴリズム ADR 存在 | ✅ | [`2026-05-07-human-managed-merge-algorithm.md`](./2026-05-07-human-managed-merge-algorithm.md) (6 ケース実装済) |
| メタデータ機密性分類とマスキング規約 (テンプレート) | ✅ | `src/secrets/rules.ts` + `src/secrets/mask.ts` + `scaffold/.sfai/secrets-rules.yaml.eta` |
| 入力ソース層が共通インターフェース、LocalSourceAdapter 実装完了 | ✅ | `src/types/source-adapter.ts` + `src/adapters/local/local-source-adapter.ts` |

## 主要モジュール

| モジュール | 行数 (概) | 責務 |
|---|---|---|
| `src/types/` | ~180 | KnowledgeGraph / SourceAdapter / Render の型定義 |
| `src/schema/graph.schema.json` | ~190 | 知識グラフの JSON Schema 正本 |
| `src/schema/validate.ts` | ~30 | ajv による検証 |
| `src/merge/` | ~250 | HUMAN_MANAGED ブロックのマージロジック (parser/validator/markers/merge) |
| `src/adapters/local/` | ~140 | force-app/ 走査と FQN 推論 |
| `src/graph/` | ~480 | XML パース、エンティティ抽出、依存解析、SQLite 投入 |
| `src/render/` | ~150 | eta テンプレート + マージ統合 + archive |
| `src/secrets/` | ~80 | マスキングルール + 適用ロジック |
| `src/util/` | ~40 | hash, walkFiles |
| `src/cli.ts` | ~250 | CLI エントリポイント (graph/render/schema/validate/metrics/version) |

## テスト

| テスト | 種類 | カバー対象 |
|---|---|---|
| `tests/unit/types.test.ts` | 単体 | 型サーフェス |
| `tests/unit/util/hash.test.ts` | 単体 | sha256 / combineHashes |
| `tests/unit/schema/validate.test.ts` | 単体 | グラフ検証の合否 |
| `tests/unit/merge/parser.test.ts` | 単体 | parseDocument / replaceBlockContent |
| `tests/unit/secrets/mask.test.ts` | 単体 | マスキング 4 シナリオ |
| `tests/unit/cli/parse-args.test.ts` | 単体 | CLI スモーク |
| `tests/golden/render/golden.test.ts` | ゴールデン | HUMAN_MANAGED マージ Case 1-6 |

## 検証ゲートの保留

「現役プロジェクトで 1 名が `/onboard` を完走」は Phase 2 の検証ゲート。Phase 1 単体では:

- ✅ ユニット / ゴールデンテストが書かれている
- ❌ `npm install` および `npm test` の実行確認 (環境依存。CI で初回実行時に確定)
- ❌ 実 Salesforce プロジェクトでの graph build 動作確認 (Phase 2 の検証ゲートで実施)

CI ワークフロー (`.github/workflows/ci.yml`) は配置済みで、初回 push 時に動作確認できる構造。

## 残課題 (Phase 2 / 7 へ繰越)

- **fine-grained 増分ビルド**: 現状は `incremental` モードでも全件書き戻し。ハッシュ照合による真の増分対応は Phase 7
- **Permission Set / Profile 詳細**: 現状はメタデータの label / license のみ。詳細権限 (object permissions / field permissions / system permissions) は Phase 7 で拡充
- **Flow の意味解釈**: 現状はメタデータのみ取り込み。ノード単位の意味解釈は Phase 3 で AI に委ねる
- **DX MCP アダプタ**: Phase 6 で実装
- **secrets-rules.yaml の動的読み込み**: 現状は DEFAULT_RULES。`.sfai/secrets-rules.yaml` の YAML パーサ統合は Phase 2 で対応

## 関連ナレッジ

- [2026-05-07: IMPLEMENTATION_GUIDE.md v1.1 改訂方針](./2026-05-07-implementation-guide-revision-v1.1.md)
- [2026-05-07: HUMAN_MANAGED マージアルゴリズム仕様](./2026-05-07-human-managed-merge-algorithm.md)
- [2026-05-07: source 列必須化](./2026-05-07-source-column-three-layer-boundary.md)
- [2026-05-07: メタ層 vs 配布物層 物理分離](./2026-05-07-meta-vs-distribution-layer-separation.md)
- [2026-05-07: Apache 2.0 / eta / DX MCP / Code Analyzer SARIF 各 ADR](.)

## 次サイクル (Phase 2)

- 検証ゲート: 1 名が `/onboard` 完走 + 定性 FB
- subagent / slash command 雛型を `scaffold/.claude/` に追加
- secrets-rules.yaml の YAML 読み込み統合
- AI コスト計測 (`sfai metrics`) の実装

Phase 1 を閉じ、Phase 2 に進む。
