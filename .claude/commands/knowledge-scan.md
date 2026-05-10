---
description: タスク開始前にナレッジベースを横断スキャンし、関連知見を要約する
argument-hint: <スキャン対象のキーワード>
---

# /knowledge-scan

`.agents/knowledge/` を横断検索し、$ARGUMENTS に関連する過去の知見を抽出して要約する。

## 実行手順

1. `.agents/knowledge/INDEX.md` を読む
2. キーワード ($ARGUMENTS) で全カテゴリを `grep` で検索
3. ヒットしたエントリを最大 5 件まで読む
4. 以下のフォーマットで報告:

   ```
   ## 過去の関連知見

   ### Decisions
   - YYYY-MM-DD: <タイトル> — <要点 1 行>

   ### Pitfalls (要注意)
   - YYYY-MM-DD: <タイトル> — <要点 1 行>

   ### Wins (再利用候補)
   - YYYY-MM-DD: <タイトル> — <要点 1 行>

   ## 推奨アクション
   - <これらの知見を踏まえて、今回どう進めるべきか>
   ```

5. ヒットがゼロの場合: 「関連ナレッジなし。新規領域。」と報告
