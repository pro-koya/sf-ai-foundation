---
description: sample-project の特定エンティティを詳細説明する
argument-hint: <object|field|flow|apex|permissionSet 名>
---

# /explain $ARGUMENTS

知識グラフ経由でエンティティの詳細を取得し、構造化して説明する。

## 実行手順

1. **エンティティ種別の判定**
   - `$ARGUMENTS` を以下の順で照合:
     ```bash
     yohaku graph query "SELECT 'object' AS kind, fqn FROM objects WHERE fqn = '$ARGUMENTS'"
     yohaku graph query "SELECT 'field' AS kind, fqn FROM fields WHERE fqn = '$ARGUMENTS'"
     yohaku graph query "SELECT 'flow' AS kind, fqn FROM flows WHERE fqn = '$ARGUMENTS'"
     yohaku graph query "SELECT 'apex' AS kind, fqn FROM apex_classes WHERE fqn = '$ARGUMENTS'"
     yohaku graph query "SELECT 'trigger' AS kind, fqn FROM apex_triggers WHERE fqn = '$ARGUMENTS'"
     ```

2. **見つかったエンティティの詳細表示**

   - **object**: `docs/generated/objects/$ARGUMENTS.md` を読み、要約 + フィールド一覧 + 依存関係を提示
   - **field**: 親オブジェクトと型・参照先・必須フラグを提示
   - **flow**: type / status / triggeringObject を提示し、`docs/human/` に業務注記があれば併記
   - **apex / trigger**: API バージョン、テストフラグ、関連オブジェクトを提示

3. **依存関係の可視化** (オプション)
   ```bash
   yohaku graph query "SELECT * FROM dependencies WHERE from_fqn = '$ARGUMENTS' OR to_fqn = '$ARGUMENTS'"
   ```
   → 「このエンティティを参照しているもの」「このエンティティが参照しているもの」を整理

4. **業務文脈の引用** (HUMAN_MANAGED 領域)
   - `docs/generated/objects/$ARGUMENTS.md` の HUMAN_MANAGED ブロックを読む
   - 業務文脈が記述されていればそれを引用
   - 空ブロックなら「業務文脈は未記述」と明示

## 出力フォーマット

```markdown
## $ARGUMENTS — <エンティティ種別>

### 構造 (決定的、知識グラフより)
- ...

### 依存関係
- 参照元: ...
- 参照先: ...

### 業務文脈 (人手記述、引用元: docs/generated/.../$ARGUMENTS.md HUMAN_MANAGED)
- ...

### 関連
- 詳細: docs/generated/objects/$ARGUMENTS.md
- 関連 ADR: (.agents/knowledge/decisions/ から検索)
```

## 禁則

- 該当エンティティが見つからなければ「未登録 / 名前違い」を確認、推測しない
- 業務文脈の捏造禁止 (HUMAN_MANAGED にあるものだけ引用)
