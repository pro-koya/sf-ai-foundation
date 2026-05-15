# sample-project — yohakuforce 検証用ダミー Salesforce DX プロジェクト

> **顧客固有情報を含まないダミーデータのみ** (禁則 8 遵守)。`yohaku` の動作確認 + 検証ゲート用。

## 構成 (Phase 6 で充実)

| 種別 | 数 | 内容 |
|---|---|---|
| Custom Object | 3 | `Customer__c`, `Order__c`, `Invoice__c` |
| Custom Field | 6 | Tier (Picklist) / Lookup×2 / Currency×2 / Checkbox |
| Validation Rule | 1 | `Customer__c.RequireTier` |
| Flow | 1 | `Order_AfterUpdate` (Record-Triggered) |
| Apex Class | 1 | `CustomerService` |
| Apex Trigger | 1 | `OrderTrigger` |
| Permission Set | 1 | `SalesOps` |
| 依存関係 | 3+ | Lookup / Trigger / Flow |

## 1 コマンドでの動作確認 (Phase 2.5 以降推奨)

```bash
yohaku init --bootstrap --target . --profile full --project-name sample-project
```

これで scaffold 展開 + graph build + render が一気通貫で動作。

## 個別実行 (デバッグ用)

```bash
# 1. scaffold 展開
yohaku init --target . --profile full --project-name sample-project

# 2. 知識グラフ構築
yohaku graph build

# 3. グラフ確認
yohaku graph query "SELECT fqn, label FROM objects ORDER BY fqn"
yohaku graph query "SELECT * FROM dependencies"
yohaku graph query "SELECT object, COUNT(*) cnt FROM fields GROUP BY object"

# 4. ドキュメント描画
yohaku render

# 5. Phase 3: 差分意味づけ (要 git init + commit)
git init -q && git add -A && git commit -q -m "baseline"
# (ここで何かファイルを編集して再コミット)
yohaku diff --from HEAD~1 --to HEAD --json
```

## 期待結果

- `objects=3, fields=6, validation_rules=1, flows=1, apex_classes=1, apex_triggers=1, permission_sets=1`
- dependencies: `Order__c.Customer__c → Customer__c`, `Invoice__c.Order__c → Order__c`, `OrderTrigger → Order__c`, `Order_AfterUpdate → Order__c`
- `docs/generated/objects/{Customer__c,Order__c,Invoice__c}.md` 生成
- full プロファイルで `.claude/agents/` に 14 種、`.claude/commands/` に 7 種

## Phase 検証用シナリオ

### Phase 3 検証 (差分意味づけ)

意図的に `Customer__c.Email__c` 等を追加して `git commit`、`/classify-diff` を Claude Code から起動。

### Phase 4 検証 (リリース準備)

`git tag v0.0.0` → 変更 → `git tag v0.1.0` → `/release-prep --from v0.0.0 --to v0.1.0`。

### Phase 5 検証 (オンボーディング)

`/onboard --role new_joiner` → `/onboard --role reviewer` 等で persona 別動作を確認。

## Salesforce 組織への deploy (オプション)

このサンプルはローカル検証用。Salesforce 組織へのデプロイは `sf project deploy start` (本 OSS スコープ外)。

## 公開時の注意

このディレクトリは **顧客固有情報を絶対に含めない**。Phase 1〜6 全機能の動作実証用。
