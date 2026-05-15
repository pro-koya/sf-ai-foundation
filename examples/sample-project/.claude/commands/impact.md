---
description: sample-project でエンティティを変更する際の影響範囲を表示
argument-hint: <object|field|flow|apex 名>
---

# /impact $ARGUMENTS

知識グラフの dependencies テーブルを使って、`$ARGUMENTS` を変更したときの影響範囲を提示。

## 実行手順

1. **直接の依存元 (Inbound) — このエンティティを参照しているもの**
   ```bash
   yohaku graph query "SELECT from_kind, from_fqn, kind FROM dependencies WHERE to_fqn = '$ARGUMENTS'"
   ```

2. **直接の依存先 (Outbound) — このエンティティが参照しているもの**
   ```bash
   yohaku graph query "SELECT to_kind, to_fqn, kind FROM dependencies WHERE from_fqn = '$ARGUMENTS'"
   ```

3. **間接 (2 ホップ) の依存元** (オプション、件数が多い時はサンプリング)
   ```bash
   yohaku graph query "SELECT DISTINCT d2.from_fqn FROM dependencies d1 JOIN dependencies d2 ON d1.from_fqn = d2.to_fqn WHERE d1.to_fqn = '$ARGUMENTS' LIMIT 20"
   ```

4. **影響カテゴリの分類** (Phase 3 で `/classify-diff` と統合予定)
   - データモデル: 参照される field / object
   - 自動化: 参照する Flow / Trigger
   - 権限: PermissionSet / Profile
   - UI: (Phase 7 で Layout / LWC 対応)

5. **業務影響の注記**
   - `docs/generated/objects/$ARGUMENTS.md` の HUMAN_MANAGED ブロックに「customer_communication_needed: true」等の記述があれば必ず引用

## 出力フォーマット

```markdown
## $ARGUMENTS — 影響範囲

### Inbound (このエンティティを参照しているもの, n 件)
- <kind>: <fqn> via <relationship>

### Outbound (このエンティティが参照しているもの, n 件)
- <kind>: <fqn> via <relationship>

### 業務影響 (HUMAN_MANAGED より)
- ...

### 推奨レビュー観点
- 変更が壊しうる Inbound 参照 (上記)
- データ移行が必要なケース (フィールド型変更時)
- 権限への影響 (PermissionSet/Profile が参照しているか)
```


## オプション (full プロファイル)

- `/impact $ARGUMENTS --include-static-analysis` で Code Analyzer SARIF を併用 (Phase 3 で実装)
- `/impact $ARGUMENTS --change-summary` で直近の変更サマリを引用 (Phase 3 で実装)


## 禁則

- 直接依存と間接依存を混同しない (件数が大きく違うため)
- 「影響なし」と断言しない: 知識グラフは標準形のみ対応 (Phase 1)、例外形は別途確認推奨
- 業務影響を推測で書かない
