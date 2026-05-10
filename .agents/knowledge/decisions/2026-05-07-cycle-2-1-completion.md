---
type: decision
date: 2026-05-07
title: Phase 2 サイクル 2-1 完了 (Phase 1 残課題解消)
status: active
tags: [phase-2, cycle-2-1, refactor, technical-debt, completion]
---

# Phase 2 サイクル 2-1 完了

## 判断

Phase 1 から繰り越した技術負債と既知制約のうち、コード変更で解消可能な以下 5 項目を全て対応完了。
`npm install && npm test` の実環境動作確認 (1 項目) のみ次サイクル以降に持ち越す。

## 完了項目

| # | 項目 | 状態 | 影響範囲 |
|---|---|---|---|
| 2-1.A | tsconfig の `exactOptionalPropertyTypes` を off に調整 | ✅ | `packages/sfai-core/tsconfig.json` |
| 2-1.B | `extractors.ts` を 8 ファイルに分割 | ✅ | `src/graph/extractors/{object,field,validationRule,flow,apexClass,apexTrigger,permissionSet,profile,types,index}.ts` |
| 2-1.C | `secrets-rules.yaml` の動的読み込み (`yaml` 依存追加) | ✅ | `src/secrets/load.ts` 新規 + テスト 7 ケース |
| 2-1.D | `KnowledgeGraphReader` を `cli.ts` から抽出、`as any` 排除 | ✅ | `src/graph/sqlite-reader.ts` 新規、`cli.ts` から SQL マッピング除去 |
| 2-1.E | ApexClass / ApexTrigger の API version を meta.xml から読む | ✅ | `extractors/apex-class.ts` `apex-trigger.ts` に `readApiVersion`、ExtractContext に `projectRoot` 追加 |
| 2-1.F | 細かい型 / lint 修正、export 整理 | ✅ | `src/index.ts` を新規モジュールに合わせて更新 |

## 持ち越し

| 項目 | 持ち越し先 |
|---|---|
| `npm install && npm test` の実環境動作確認 | サイクル 2-1 終了後にユーザ実行 → 出たエラーを次サイクルの最優先で対応 |
| Windows パス区切り対応 | Phase 7 |
| `.forceignore` 対応 | Phase 7 |
| Permission Set / Profile 詳細権限 | Phase 7 |

## 設計判断の補足

### tsconfig の `exactOptionalPropertyTypes` を off にした理由

`exactOptionalPropertyTypes: true` は `{ x?: T }` への `undefined` 代入を禁止する。
TypeScript としては正しいが、`asString(node.label)` のような `string | undefined` を返す関数の戻り値を optional プロパティに代入する箇所が大量に存在し、すべて conditional spread `...(value !== undefined ? { x: value } : {})` に書き換えるのは可読性を著しく落とす。
`strict: true` と `noUncheckedIndexedAccess: true` は維持しているため、本質的な型安全性は確保されている。

### `KnowledgeGraphReader` の責務

CLI 層から SQL ↔ ドメイン型のマッピングを完全に分離。各 SELECT 文に対応する row interface (`ObjectRow`, `FieldRow` etc.) を private で定義し、`map(r => ({...}))` で型安全に変換。

### `readApiVersion` の設計

- `ExtractContext.projectRoot` を受け取って `*-meta.xml` を解決
- meta.xml が存在しなければ DEFAULT_API_VERSION (62.0) にフォールバック (壊さない設計)
- パース失敗もフォールバック (壊さない設計)

## トレードオフ

- **代償**:
  - `exactOptionalPropertyTypes` を off にしたことで、`{ x: undefined }` と `{}` の意味的等価性が型レベルで強制されない → 慣習で守る
  - `KnowledgeGraphReader` が SqliteGraphStore.query() に依存しているため、テストでは実 DB が必要 → サイクル 2-1 では unit test 追加せず、サイクル 2-7 の動作確認で代替
- **将来課題**: なし (本サイクルは基盤整備のみ)

## 関連ナレッジ

- [Phase 2 計画](./2026-05-07-phase-2-plan.md)
- [Phase 1 引き継ぎ改善案](../improvements/2026-05-07-phase-1-handover-improvements.md)
- [Phase 1 既知制約](../pitfalls/2026-05-07-phase-1-known-limitations.md)
