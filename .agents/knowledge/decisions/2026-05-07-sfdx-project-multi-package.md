---
type: decision
date: 2026-05-07
title: sfdx-project.json の packageDirectories を尊重して複数パッケージを走査
status: active
supersedes:
superseded_by:
tags: [phase-2, sfdx-project, local-source-adapter, salesforce-dx]
---

# sfdx-project.json の packageDirectories を尊重

## 判断

`LocalSourceAdapter` を `sfdx-project.json` の `packageDirectories` 配列を読み取り、**全パッケージディレクトリを走査** するように拡張した。
明示的な `packageDirectories` オプション、`sfdx-project.json`、デフォルト `force-app/` の **3 段フォールバック** で動作する。

## 文脈

- Salesforce DX では `sfdx-project.json` の `packageDirectories` で複数のパッケージ (例: `force-app`, `extra-package`) を定義できる。
- Phase 1 完了 ADR の段階では `force-app/` 固定で、複数パッケージ構成のプロジェクトでは他のパッケージが拾えなかった。
- Phase 2 の着手準備として、利用者の現役プロジェクトが複数パッケージ構成である可能性に備える。

## 解決順 (3 段フォールバック)

```
1. options.packageDirectories が指定されていればそれを使う (テスト・カスタム用途)
       ↓
2. sfdx-project.json があれば packageDirectories を読み取る
       ↓
3. それも無ければ ["force-app"] にフォールバック (Salesforce DX 標準)
```

## 設計ポイント

- **正本フォーマット尊重**: 公式の `sfdx-project.json` 仕様 (https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm) に従う
- **デフォルト推論**: `default: true` フラグが無ければ先頭を default に昇格
- **重複ガード**: 複数パッケージで同じファイルが見つかっても `sourcePath` で deduplication
- **存在しないディレクトリは黙ってスキップ**: 設定に書かれているが空のパッケージは警告無しで通過

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **3 段フォールバック (本案)** | 採用 | sfdx-project.json を尊重しつつ、CLI / テストのオーバーライドが効く |
| B. options 必須化 | 却下 | 利用者の手間が増える |
| C. sfdx-project.json 必須化 | 却下 | 簡易プロジェクト / サンプルでも動かない |
| D. SDR の `ComponentSet.fromSource(rootPath)` を直接呼ぶ | 却下 | 依存重 + パフォーマンス低下、Phase 1 の独自パーサで十分 |

## トレードオフ

- **代償**:
  - sourceApiVersion / namespace は読むが現状未使用 → Phase 7 の機能拡張で活用予定
  - ディレクトリ間の優先順位が暗黙 (先勝ち) → 警告ログを出すかは Phase 5 で再考
- **将来課題**:
  - SDR の registry や `.forceignore` を尊重した除外ロジックは Phase 7

## テスト

`tests/unit/adapters/sfdx-project.test.ts` に以下 8 ケース:

1. `sfdx-project.json` 不在 → default
2. `packageDirectories` を読み取る + sourceApiVersion
3. default 指定無し → 先頭を昇格
4. 空配列 → フォールバック
5. 不正 JSON → エラー
6. `packageDirectories` フィールド無し → フォールバック
7. **多パッケージ統合**: `pkg-a` `pkg-b` 両方からオブジェクトを取得
8. **options 上書き**: `packageDirectories` オプションが sfdx-project.json より優先

## 影響範囲

- `packages/sfai-core/src/adapters/local/sfdx-project.ts` (新規)
- `packages/sfai-core/src/adapters/local/local-source-adapter.ts` (拡張)
- `packages/sfai-core/src/adapters/local/index.ts` (export 追加)
- `packages/sfai-core/tests/unit/adapters/sfdx-project.test.ts` (新規)

## 関連ナレッジ

- [2026-05-07: Phase 2 計画](./2026-05-07-phase-2-plan.md)
- [2026-05-07: Phase 1 完了宣言](./2026-05-07-phase-1-completion.md)
