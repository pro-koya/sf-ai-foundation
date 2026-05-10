# scaffold/.claude/ — 利用者プロジェクト用 Claude Code 設定ひな型

`sfai init` で利用者プロジェクトの `.claude/` として展開される。

| サブディレクトリ | 構築 Phase | 内容 |
|---|---|---|
| `commands/` | Phase 2〜5 | `/onboard` `/impact` `/explain` `/classify-diff` `/release-prep` `/manual-steps` 等 |
| `agents/` | Phase 2〜5 | graph-querier, object-documenter, onboarding-guide, data-model-classifier, manual-step-extractor 等 |
| `settings.json` | Phase 2 | hooks (`PostToolUse(force-app/**)` → `sfai graph build --incremental`)、権限 |

メタ層 `/.claude/` (本リポジトリの開発時 Claude Code 設定) と混同しないこと。
