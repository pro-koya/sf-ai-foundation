---
type: pitfall
date: 2026-05-07
title: CI 初回実行と E2E スモークテストで顕在化した 6 件のバグ
severity: high
tags: [phase-2, cycle-2-1, ci, e2e, bugs]
---

# CI 初回実行と E2E スモークテストで顕在化したバグ

## 何が起きたか

サイクル 2-1 完了直後に CI (`npm install / typecheck / lint / test`) と E2E スモークテスト (ダミー Salesforce DX プロジェクト `/tmp/yohaku-smoke/` で `graph build → render` を通す) を実行したところ、6 件のバグが見つかった。**全件修正完了済み**。

## バグ一覧

### B1: peerDependencies に @salesforce/cli を入れたら巨大インストールでディスク不足

**事象**: `npm install` が ENOSPC で失敗。`@salesforce/cli` が peer dep + `optional: false` で auto-install され、約 GB 単位のインストールが発生。
**根本原因**: npm 7+ は peer dependencies を自動インストールする。`@salesforce/cli` は利用者が **グローバル** で入れるべきツールなので peer 宣言は誤り。
**修正**: ルート `package.json` から `peerDependencies` セクションを削除。CONTRIBUTING.md / docs に「sf CLI はグローバルインストール推奨」と明記する (Phase 6 で docs 整備時に対応)。
**再発防止**: 公式 CLI ツールを peer dep として宣言しない。global install を前提とした記述にとどめる。

### B2: `Array.prototype.toSorted` が ES2022 lib で使えない

**事象**: `toSorted` を多用しているが tsconfig の `lib: ["ES2022"]` だと型エラー。
**修正**: `target: "ES2023"` + `lib: ["ES2023"]` に上げた。Node 20+ なので問題なし。
**再発防止**: 新しい Array 関連メソッド (`toSorted`, `toReversed`, `findLast`) は ES2023+ なので、最初から ES2023 をターゲットにする方が無難。

### B3: `CommandHandler` の二重ラップで型エラー

**事象**: `cli.ts` の COMMANDS Map が `Map<string, CommandHandler>` で、`CommandHandler = { handler: fn }`。さらに findCommand が `{ key, handler: CommandHandler }` を返すため、`cmd.handler(args)` が `{ handler: fn }` を関数として呼ぶ形になりエラー。
**修正**: `cmd.handler.handler(args)` に修正。
**再発防止**: 中間オブジェクトに同じ名前 (`handler`) を使うと混乱の元。次のリファクタで `cmd.run(args)` のようにリネーム検討。

### B4: Ajv v8 デフォルトでは JSON Schema draft-2020-12 を扱えない

**事象**: `validateGraph` が `Error: no schema with key or ref "https://json-schema.org/draft/2020-12/schema"` で失敗。
**根本原因**: Ajv v8 のデフォルトインスタンスは draft-07 サポート。draft-2020-12 (`$defs` 等) には `Ajv2020` を使う必要がある。
**修正**: `import Ajv2020 from "ajv/dist/2020.js"` に変更。
**再発防止**: JSON Schema の `$schema` 宣言と Ajv インスタンス選択を一致させる。schema.json で draft-2020-12 を使うなら Ajv2020 一択。

### B5: Salesforce ID 正規表現が大文字のみで実 ID にマッチしない

**事象**: `\b00[A-Z0-9]{16}\b` というパターンで実 18 文字 ID `001A0000001abcdEFG` (大小混在) にマッチせず、masking テストが失敗。
**根本原因**: Salesforce 15 文字 ID は大小混在 (case-sensitive)。18 文字 ID は 15 文字 + 3 文字大文字 suffix で構成され、全体としては大小混在。
**修正**: `\b00[A-Za-z0-9]{13}\b` (15 文字)、`\b00[A-Za-z0-9]{16}\b` (18 文字) に変更。
**再発防止**: Salesforce 仕様の正規表現は実 ID サンプルでテスト。

### B6: ディレクトリ名ベースの分類で `objects/` 配下のフィールド / VR が CustomObject に誤分類

**事象**: smoke test で `objects=2 fields=0` (期待 `objects=1 fields=1`)。`objects/Account/fields/Industry.field-meta.xml` が `objects` を含むため CustomObject として誤分類。
**根本原因**: `inferDirectory` が `segments.includes(dir)` で最初にマッチしたディレクトリを採用していたため、ネストした `fields/` を見逃す。
**修正**: ファイル拡張子ベースの分類 (`EXTENSION_CLASSIFIERS`) に変更。`*.object-meta.xml` `*.field-meta.xml` 等で一意に判定。
**再発防止**: ディレクトリ名は補助情報として扱い、ファイル拡張子を主たる分類軸にする。Salesforce DX は拡張子規約が安定しているため、こちらの方が堅牢。

### B7: `parseTagValue: true` で `apiVersion` "60.0" が数値 60 になり情報損失

**事象**: graph build 後の query で `api_version="60"` (期待 "60.0")。
**根本原因**: `fast-xml-parser` の `parseTagValue: true` が "60.0" を数値 60 にパース → `String(60)` で "60" になる。
**修正**: `parseTagValue: false` `parseAttributeValue: false` に変更。Salesforce XML の値は基本的に文字列として扱う方が正しい。
**再発防止**: `asString` / `asBoolean` ヘルパーで型変換するため、parser 側で auto-parse は不要 (むしろ有害)。

### B8: graph query コマンドの SQL 引数が parser で誤って `command` 配列に入る

**事象**: `yohaku graph query "SELECT ..." --root /tmp/yohaku-smoke` で SQL が `args.positional` に入らず空文字列扱いになり Usage エラー。
**根本原因**: `parseArgs` は `--flag` を見るまで argv を `command[]` に積む設計。SQL は flag より前に来るので command に入る。
**修正**: `cmdGraphQuery` 内で `args.command.slice(2)` も SQL 候補として結合する。
**再発防止**: subcommand の引数解析は CLI ライブラリ (commander 等) の利用を Phase 5/6 で再検討。手書き parser はエッジケースが多い。

## 検出経路

- B1, B2, B3: `npm run typecheck` 初回実行
- B4, B5: `npm test` 初回実行 (3 件失敗)
- B6, B7, B8: ダミー Salesforce プロジェクト (`/tmp/yohaku-smoke/`) での E2E 実行

## 効果検証

修正後:
- typecheck: ✅ pass
- lint: ✅ pass
- test: ✅ 47/47 pass
- build: ✅ pass + assets copy 動作
- E2E: ✅ `graph build` (objects=1 fields=1 apex=1) → `render system-index` → `render objects` → HUMAN_MANAGED 編集 → 再 render で人手内容保持 ✅

## 関連ナレッジ

- [サイクル 2-1 完了 ADR](../decisions/2026-05-07-cycle-2-1-completion.md)
- [Phase 1 既知制約](./2026-05-07-phase-1-known-limitations.md) (B6 を解消)
- [Phase 1 引き継ぎ改善案](../improvements/2026-05-07-phase-1-handover-improvements.md) (CI 緑化 を達成)
