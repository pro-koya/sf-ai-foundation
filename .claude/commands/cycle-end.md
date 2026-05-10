---
description: サイクルを締めくくり、振り返りを永続化して次サイクルの種を出す
---

# /cycle-end

自律ループの「7. 整理 → 8. 課題提起」を実行し、サイクルを閉じる。

## 実行手順

1. **整理**
   - 不要コード・コメント・ファイルの削除
   - 命名・分割の見直し
   - README / IMPLEMENTATION_GUIDE / 派生ドキュメントの同期
   - 改善できた点を `.agents/knowledge/improvements/` に記録

2. **振り返り執筆**
   - `.agents/templates/retrospective.md` をコピー
   - `.agents/knowledge/retrospectives/YYYY-MM-DD-<cycle-slug>.md` として保存
   - Keep / Problem / Try を必ず記入
   - 関連ナレッジ (decisions / pitfalls / wins / improvements) をリンク

3. **次サイクルの種**
   - 振り返りの「7. 課題提起」セクションに最低 1 件の課題を出す
   - 課題が次サイクルの `/cycle-start` の入力になる

4. **INDEX 更新**
   - `.agents/knowledge/INDEX.md` の Retrospectives と Improvements に 1 行追加

5. **報告**
   - サイクル要約を 3 行で
   - 次サイクル候補を 1〜3 件提示

詳細は [`AGENTS.md` § 7-8](../../AGENTS.md#7-整理) を参照。
