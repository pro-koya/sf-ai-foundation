# scaffold/ — 配布物の雛型 (yohaku init で展開される一式)

> **この層は「OSS を導入した利用者プロジェクト」に展開されるひな型を置く場所。**
> リポジトリルート直下の `CLAUDE.md` `AGENTS.md` `.claude/` `.agents/` (= **メタ層**) とは用途が異なる。

## 何が入る予定か

`yohaku init` を利用者プロジェクトで実行すると、このディレクトリ配下が **eta テンプレートとして展開** されて配置される。

| ファイル / ディレクトリ | 用途 | 構築 Phase |
|---|---|---|
| `CLAUDE.md.eta` | 利用者プロジェクトの Claude Code 憲法ひな型 | Phase 2 / 5 |
| `AGENTS.md.eta` | 利用者プロジェクトの自律ループ指示書ひな型 | Phase 2 / 5 |
| `.claude/settings.json` | Claude Code 設定（権限・hooks） | Phase 2 |
| `.claude/commands/*.md` | `/onboard` `/impact` `/classify-diff` `/release-prep` 等の slash command | Phase 2-4 |
| `.claude/agents/*.md` | graph-querier, object-documenter, onboarding-guide 他の subagent | Phase 2-5 |
| `.agents/knowledge/INDEX.md` | 利用者プロジェクトのナレッジ索引初期状態 | Phase 2 |
| `.agents/knowledge/README.md` | ナレッジ運用の説明 | Phase 2 |
| `.agents/templates/*.md` | decision / pitfall / win / improvement / retrospective テンプレ | Phase 2 |
| `.gitignore` | `.yohaku/`, `.claude/local/` などの除外設定 | Phase 1 |

## 命名規則

- **eta テンプレート**: ファイル名に `.eta` を付ける（例: `CLAUDE.md.eta`）。eta が変数を展開して最終ファイル名 (`CLAUDE.md`) を生成
- **静的設定**: 変数展開が不要なファイルは `.eta` を付けない（例: `.gitignore`、`.claude/agents/knowledge-curator.md`）
- **判定基準**: ファイル内容にプロジェクト名・パス・選択プロファイル等のプレースホルダがあれば eta、無ければ静的

## 編集時の注意（**重要**）

- このディレクトリ配下のファイルは **OSS 開発時の Claude Code に対しては「資料」であって「指示」ではない**
- リポジトリルートの `CLAUDE.md` `AGENTS.md` (= メタ層) との混同を絶対に避ける
- メタ層ファイルを `scaffold/` にそのままコピーしてはいけない（対象読者が違う：開発者向け vs 利用者向け）
- 詳細は [メタ層 vs 配布物層 ADR](../.agents/knowledge/decisions/2026-05-07-meta-vs-distribution-layer-separation.md) 参照

## 現状

**空のスケルトンのみ**。中身は Phase 1〜6 の実装と並行して段階的に書き起こす。
