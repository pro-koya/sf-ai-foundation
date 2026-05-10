# Google Antigravity 互換性 (Phase 6 ドキュメント)

> **Status**: Phase 6 ではドキュメント注記レベル。実機検証は Phase 7 で利用者フィードバックを待つ。

## 互換の前提

SF-AI-Foundation の中核成果物は以下の **AI プラットフォーム非依存** な形式で書かれている:

| 成果物 | 形式 | 互換性 |
|---|---|---|
| `scaffold/AGENTS.md.eta` | Markdown + frontmatter | ✅ Antigravity / Codex / Claude Code 共通 |
| `scaffold/.claude/agents/*.md.eta` | Markdown system prompt + frontmatter | ⚠ Antigravity の subagent 機構に依存 |
| `scaffold/.claude/commands/*.md.eta` | Markdown + argument-hint | ⚠ Claude Code 慣行 (slash command) |
| `sfai` CLI | Node.js TypeScript | ✅ プラットフォーム非依存 |
| 知識グラフ / change_summary / release_doc | JSON Schema | ✅ プラットフォーム非依存 |

## Antigravity 特有の対応 (Phase 6 では未実装)

Phase 7 で対応予定:

- `.antigravity/tasks.json` 自動生成 (`sfai init --antigravity`)
- `.antigravity/agent-workspaces.yaml` 配置
- subagent system prompt を Antigravity 形式へ変換

## 当面の利用方針

Antigravity ユーザは以下を試せる (Phase 6 時点):

1. **Markdown ベースの prompt は流用可能**: `scaffold/.claude/agents/*.md.eta` の system prompt 本文 (frontmatter 除く) を Antigravity の agent 定義にコピー
2. **slash command の論理は流用可能**: `scaffold/.claude/commands/*.md.eta` の手順を Antigravity の workflow として再構築
3. **`sfai` CLI は無関係に動く**: Antigravity から Bash で `sfai graph build` `sfai diff` `sfai onboard` を呼び出せる
4. **知識グラフ + Schema は完全互換**: Antigravity 上のエージェントが `sfai graph query` を直接実行可能

## 既知の制約

- **Claude Code の Plugin 配布形式 (`.claude/settings.json`) は Antigravity で動作しない可能性**
- **subagent の Task 並列起動メカニズム** は Claude Code 固有 → Antigravity の同等機構が要対応 (Phase 7)
- **HUMAN_MANAGED ブロック保護** は本 OSS の独自実装のため、両プラットフォームで同様に動作

## 検証ロードマップ

| Phase | 内容 |
|---|---|
| Phase 6 | 本ドキュメント整備 (注記レベル) |
| Phase 7 | Antigravity ユーザによる実機検証、`.antigravity/` 自動生成、互換性マトリクス |

## 関連 ADR

- decisions/[Phase 6 計画](../../.agents/knowledge/decisions/2026-05-08-phase-6-plan.md)
- IMPLEMENTATION_GUIDE.md Phase 6 §代替案 D
