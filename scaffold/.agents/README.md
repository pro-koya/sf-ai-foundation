# scaffold/.agents/ — 利用者プロジェクト用ナレッジ基盤ひな型

`yohaku init` で利用者プロジェクトの `.agents/` として展開される。利用者プロジェクトでも自律ループのナレッジ蓄積機構が動くように、空の INDEX とテンプレートを用意する。

| サブディレクトリ | 構築 Phase | 内容 |
|---|---|---|
| `knowledge/INDEX.md` | Phase 2 | 利用者プロジェクト用の空索引（カテゴリ見出しのみ） |
| `knowledge/README.md` | Phase 2 | 利用者向けのナレッジ運用ガイド |
| `knowledge/{decisions,pitfalls,wins,improvements,retrospectives}/.gitkeep` | Phase 2 | 空ディレクトリ保持 |
| `templates/*.md` | Phase 2 | decision / pitfall / win / improvement / retrospective のひな型 |

メタ層 `/.agents/` (本リポジトリ開発のナレッジ) と混同しないこと。
