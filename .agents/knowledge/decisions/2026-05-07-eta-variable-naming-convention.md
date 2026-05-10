---
type: decision
date: 2026-05-07
title: scaffold/ で使う eta テンプレート変数の命名規則と標準セット
status: active
supersedes:
superseded_by:
tags: [scaffold, eta, naming-convention, sfai-init]
---

# scaffold/ で使う eta テンプレート変数の標準セット

## 判断

`scaffold/` 配下のテンプレートが `sfai init` で展開される際に参照する変数の **標準セットと命名規則** を以下に確定する。

### 命名規則

- すべての変数は **`it.` ネームスペース** 配下 (eta デフォルト)
- **camelCase** で統一
- 真偽値は `is*` `has*` `should*` `can*` 接頭辞
- 配列は複数形 (`features`, `enabledCommands`)
- enum は文字列リテラル合併、未指定時のデフォルトを定義

### 標準変数セット (v1)

| 変数名 | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| `it.projectName` | string | ✅ | (init で対話入力) | 利用者プロジェクトの表示名 |
| `it.profile` | `'minimal' \| 'standard' \| 'full'` | ✅ | `'standard'` | 導入プロファイル |
| `it.primaryLanguage` | `'ja' \| 'en'` | ✅ | `'ja'` | ドキュメント言語 (Phase 7 で en 対応) |
| `it.salesforceApiVersion` | string | ✅ | 直近の安定 API (例 `'62.0'`) | 対象 API バージョン |
| `it.sfaiVersion` | string | ✅ | (`package.json` から自動) | 利用者がインストールした sfai のバージョン |
| `it.segment` | `'enterprise' \| 'smb' \| 'vendor' \| 'unspecified'` | ❌ | `'unspecified'` | 想定セグメント (テンプレート挙動の微調整に使用) |
| `it.repoUrl` | string | ❌ | `''` | プロジェクトの Git リポジトリ URL (生成 README に表示) |
| `it.enabledCommands` | string[] | ❌ | (profile から導出) | 有効化するスラッシュコマンドの allowlist |
| `it.enabledAgents` | string[] | ❌ | (profile から導出) | 有効化する subagent の allowlist |
| `it.includeDxMcpAdapter` | boolean | ❌ | `false` | DX MCP アダプタを同梱するか (Phase 6 から有効) |
| `it.includeStaticAnalysis` | boolean | ❌ | `false` | Code Analyzer SARIF 連携を有効にするか (Phase 3 から) |
| `it.now` | string (ISO 8601) | ✅ | (init 実行時刻) | テンプレート展開時刻 (生成スタンプ用) |

### profile から導出されるデフォルト

`enabledCommands` / `enabledAgents` を明示しない場合、`profile` から自動展開する。

| profile | enabledCommands (代表例) | enabledAgents (代表例) |
|---|---|---|
| minimal | `/onboard`, `/explain`, `/impact` | graph-querier, object-documenter |
| standard | minimal + `/classify-diff`, `/change-summary` | minimal + 5 種の差分分類器 |
| full | standard + `/release-prep`, `/manual-steps` | standard + manual-step-extractor, release-composer, rollback-drafter |

具体的な対応表は Phase 6 の `sfai init` 実装時に scaffolding ロジックで確定する。

## 文脈

- `scaffold/CLAUDE.md.eta` `scaffold/AGENTS.md.eta` `scaffold/.claude/settings.json.eta` を起こした際 (2026-05-07 サイクル 2)、`<%= it.projectName %>` `<%= it.profile %>` 等の変数を散発的に使用した。
- このまま放置すると、Phase 6 で `sfai init` を実装する際に変数名揺れ (例: `projectName` vs `name` vs `pname`) が発生し、テンプレート修正コストが膨らむ。
- 早期に標準セットを固めて scaffold 全体で一貫させる必要がある。

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **`it.` ネームスペース + camelCase + 標準セット定義 (本案)** | 採用 | eta デフォルト、TS との親和性、実装コストゼロ |
| B. eta の `useWith: true` で `it.` を省略 | 却下 | 変数のスコープが暗黙化、デバッグ性が落ちる |
| C. snake_case を採用 | 却下 | TS / JS 慣行と異なり、内部の TypeScript 型と二重管理になる |
| D. 変数を JSON Schema で型定義し ajv で検証 | 採用 (派生対応) | 案 A と併用可能。Phase 6 で `sfai init` の入力を JSON Schema で validate する |

## トレードオフ

- **代償**:
  - 標準セットを増やすと scaffold が複雑になる → 必須 5 + オプション数個に絞った
  - eta 変数は内部の TypeScript 型 (init オプション) と二重定義になる → Phase 6 で `Tracked<T>` と同様のヘルパーで型生成を自動化検討
- **将来課題**:
  - 利用者が独自変数を追加したい場合 (例: 顧客名コードを埋め込みたい) → `it.custom: Record<string, unknown>` を Phase 6 で追加検討。今回の v1 では未対応

## バリデーション

- Phase 6 の `sfai init` 実装時に、入力変数を JSON Schema で必須チェック
- 必須変数が欠けたら明示的エラーで停止 (デフォルトで埋めない)
- enum 型の値外指定もスキーマで弾く

## 影響範囲

- 既に作成済みの `scaffold/CLAUDE.md.eta` `scaffold/AGENTS.md.eta` `scaffold/.claude/settings.json.eta` は本標準セットに従っているか要確認 → 要確認結果を pitfalls/ または improvements/ に記録予定
- IMPLEMENTATION_GUIDE.md の Phase 6 章に、`sfai init` 実装時の変数仕様参照先として本 ADR をリンク

## 関連ナレッジ

- [2026-05-07: メタ層 vs 配布物層 物理分離](./2026-05-07-meta-vs-distribution-layer-separation.md)
- [2026-05-07: テンプレートエンジン eta 確定](./2026-05-07-template-engine-eta.md)
