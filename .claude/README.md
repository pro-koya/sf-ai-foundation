# .claude/ — Claude Code 設定

このディレクトリは、本プロジェクトに参加する Claude Code の **挙動を整える設定群**。
プロジェクトの行動指針本体は [`/AGENTS.md`](../AGENTS.md) と [`/CLAUDE.md`](../CLAUDE.md) を参照すること。

## 構成

```
.claude/
├── settings.json        ← 環境設定 (hooks, allow/deny, env)
├── commands/            ← Slash commands (/cycle-start など)
└── agents/              ← Subagents (knowledge-curator など)
```

## 設計方針

- **最小から始める**: 初期は本当に必要な数個だけ。Phase 2 以降で順次拡充。
- **subagent は隔離が要る時のみ**: 主エージェントが見えなくなる弊害より、隔離の利点が上回る場合だけ。
- **hooks で重い処理を挟まない**: `PostToolUse` は数百ms で完了するもののみ。
