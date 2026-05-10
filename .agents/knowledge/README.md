# .agents/knowledge — 永続ナレッジベース

このディレクトリは、AI 自律ループが蓄積する知見の保管場所である。
**AI は新しいタスクの開始時に必ずここを参照し、サイクル末に必ずここへ書き戻す。**

詳細は [`AGENTS.md` § 2. ナレッジ蓄積ルール](../../AGENTS.md#2-ナレッジ蓄積ルール永続自己改善) を参照。

## 構成

```
.agents/knowledge/
├── INDEX.md             ← まずここを見る (索引)
├── decisions/           ← 設計判断・採用理由
├── pitfalls/            ← つまずき・不具合
├── wins/                ← 効いた工夫
├── improvements/        ← 改善した点・改善案
└── retrospectives/      ← サイクル単位の振り返り
```

## 書き方

[`.agents/templates/`](../templates/) のテンプレートに従う。
ファイル名は `YYYY-MM-DD-<short-slug>.md`。

## 重要原則

- **古い知見は削除しない**。`Status: Superseded by ...` を冒頭に追記して残す。
- **新規追加時は INDEX.md に 1 行サマリを必ず追加する**。
- **個人情報・顧客情報は書かない**。
