---
type: win
date: 2026-05-07
title: ダミー Salesforce DX プロジェクトでの E2E スモークテストパターン
tags: [phase-2, e2e, smoke-test, salesforce-dx]
---

# ダミー Salesforce DX プロジェクトでの E2E スモークテストパターン

## 何が効いたか

Phase 1 完了後の動作確認で、`/tmp/sfai-smoke/` に **最小の Salesforce DX プロジェクト構造** をその場で組み立て、`sfai graph build → query → render` を通すスモークテストパターンを発見した。
ユニットテストでは検出できないバグが 3 件 (B6, B7, B8) このパターンで顕在化。

## なぜ効いたか

- **実ファイル系のディレクトリ走査**: ユニットテストでは LocalSourceAdapter のディレクトリパス処理を完全には再現しづらい。実 fs での動作が必須
- **拡張子による分類のエッジケース**: `objects/Account/fields/X.field-meta.xml` のようにディレクトリ名がネストするケースをユニットテストで漏らすと、E2E でないと気づけない
- **XML パーサのオプション影響**: `parseTagValue: true` で `60.0` → 60 になる問題は、実メタデータの実 apiVersion を読まないと発見できない
- **CLI 引数解析のエッジケース**: 手書き parser の振る舞いを実コマンドで叩くことで命令の不整合を発見

## 適用条件

- 利用者プロジェクトにアクセス権が無くても、最小の Salesforce DX 構造は数分で再現可能
- 顧客固有情報を含めない (禁則 8): ダミー Account, ダミー field, ダミー Apex で十分

## 再利用方法

各サイクルの最後に **以下のフローを 5 分以内に実施**:

```bash
# 1. ダミープロジェクトを /tmp に作成
mkdir -p /tmp/sfai-smoke/force-app/main/default/{objects/Account/fields,classes}

cat > /tmp/sfai-smoke/sfdx-project.json <<'EOF'
{
  "packageDirectories": [{ "path": "force-app", "default": true }],
  "sourceApiVersion": "62.0"
}
EOF

cat > /tmp/sfai-smoke/force-app/main/default/objects/Account/Account.object-meta.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">
  <label>Account</label>
  <pluralLabel>Accounts</pluralLabel>
  <sharingModel>Read</sharingModel>
</CustomObject>
EOF

cat > /tmp/sfai-smoke/force-app/main/default/objects/Account/fields/Industry.field-meta.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">
  <fullName>Industry</fullName>
  <label>Industry</label>
  <type>Picklist</type>
</CustomField>
EOF

cat > /tmp/sfai-smoke/force-app/main/default/classes/AccountService.cls <<'EOF'
public with sharing class AccountService {
    public static List<Account> findActive() {
        return [SELECT Id, Name FROM Account];
    }
}
EOF

cat > /tmp/sfai-smoke/force-app/main/default/classes/AccountService.cls-meta.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
  <apiVersion>60.0</apiVersion>
  <status>Active</status>
</ApexClass>
EOF

# 2. 通しで実行
cd /tmp/sfai-smoke
node /path/to/sfai-core/dist/cli.js graph build --root /tmp/sfai-smoke
node /path/to/sfai-core/dist/cli.js graph query "SELECT * FROM objects" --root /tmp/sfai-smoke
node /path/to/sfai-core/dist/cli.js render system-index --root /tmp/sfai-smoke
node /path/to/sfai-core/dist/cli.js render objects --root /tmp/sfai-smoke

# 3. HUMAN_MANAGED 保護検証 (重要)
# - 出力 docs/generated/objects/Account.md の HUMAN_MANAGED ブロックに何か書く
# - 再 render で削除されないことを目視確認
```

期待値:
- objects=1 fields=1 apex=1 (これ以外なら何かが間違っている)
- query で SQL が動く
- render が `docs/generated/system-index.md` と `docs/generated/objects/Account.md` を生成
- HUMAN_MANAGED 編集が再 render 後も保持

## 関連ナレッジ

- [CI / E2E バグ 8 件](../pitfalls/2026-05-07-ci-and-e2e-bugs.md) — このパターンで検出
- [サイクル 2-1 完了 ADR](../decisions/2026-05-07-cycle-2-1-completion.md)
- Phase 2 サイクル 2-7 (サンプルプロジェクト動作確認) で本パターンを `examples/sample-project/` に正式化予定
