---
description: 自律ループの新しいサイクルを開始する (要件整理 → 計画立案)
argument-hint: <タスクの一文要約>
---

# /cycle-start

新しい自律ループのサイクルを開始する。引数 `$ARGUMENTS` をタスクの起点として扱う。

## 実行手順

1. **既存ナレッジの確認** (絶対省略しない)
   - `.agents/knowledge/INDEX.md` を読み、関連カテゴリをスキャン
   - 類似の `decisions/` `pitfalls/` `wins/` `improvements/` を最大 3 件まで読む

2. **要件整理**
   - $ARGUMENTS を「誰の何を解決するか」の一文に翻訳
   - 制約・前提・成功条件を箇条書き
   - 不明点があれば人間に質問する (推測しない)

3. **計画立案**
   - 該当する Phase (1〜7) を判定
   - 設計 3 原則・禁則 10 か条と照合
   - 代替案を最低 2 つ提示し、トレードオフを記述
   - 採用案・却下案・理由を `.agents/knowledge/decisions/YYYY-MM-DD-<slug>.md` に記録
   - `.agents/knowledge/INDEX.md` に 1 行サマリを追記

4. **次ステップ提示**
   - 実装に着手する前に、人間の承認を求める
   - 承認後、`/cycle-execute` で実行フェーズに進む

詳細は [`AGENTS.md`](../../AGENTS.md) を参照。
