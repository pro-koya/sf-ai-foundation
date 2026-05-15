# Knowledge Graph Schema (`.yohaku/graph.sqlite`)

> yohakuforce の知識グラフは SQLite で実装されている。本書はその **テーブル / カラムの正本** であり、`yohaku graph query` を発行する際の必読資料である。

---

## 0. クエリ規約 (最重要)

`yohaku graph query` は **外部入力 SQL を受け取る経路** であり、以下の制約がある。

### 許可されること

- 単一の `SELECT` 文
- 単一の `WITH ... SELECT` 文 (CTE)

### 禁止されること (実行時エラーになる)

- `PRAGMA` — スキーマ確認は `yohaku graph schema --tables` を使う
- `ATTACH`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`
- 複文 (セミコロン区切り)
- コメントに紛れた追加命令

### よくある誤り

| やりがちなクエリ | 正しいアプローチ |
|---|---|
| `PRAGMA table_info(objects)` | `yohaku graph schema --tables` |
| `SELECT fullyQualifiedName FROM objects` | カラム名は **snake_case の `fqn`** |
| `WHERE triggeringObject = 'X'` | カラム名は `triggering_object` |
| `SELECT events FROM apex_triggers` | カラム名は `events_json` (JSON文字列) |

> **重要**: テーブル/カラム名は **snake_case**。`renderers/` 配下で SELECT エイリアスとして `fullyQualifiedName` を返す箇所があるが、それは出力時のキー名であり、DB のカラム名ではない。

---

## 1. テーブル一覧

| テーブル | 主キー | 概要 |
|---|---|---|
| `meta` | `key` | グラフメタ情報 (生成時刻、source root など) |
| `objects` | `fqn` | SObject (標準/カスタム) |
| `fields` | `fqn` | フィールド定義 |
| `validation_rules` | `fqn` | 入力規則 |
| `flows` | `fqn` | Flow / Process Builder |
| `apex_classes` | `fqn` | Apex クラス |
| `apex_triggers` | `fqn` | Apex トリガ |
| `permission_sets` | `fqn` | 権限セット |
| `profiles` | `fqn` | プロファイル |
| `record_types` | `fqn` | レコードタイプ |
| `approval_processes` | `fqn` | 承認プロセス |
| `sharing_rules` | `fqn` | 共有ルール |
| `layouts` | `fqn` | ページレイアウト |
| `custom_metadata_records` | `fqn` | カスタムメタデータ型レコード |
| `named_credentials` | `fqn` | 名前付き資格情報 |
| `remote_site_settings` | `fqn` | リモートサイト設定 |
| `lwcs` | `fqn` | Lightning Web Component |
| `aura_bundles` | `fqn` | Aura バンドル |
| `flexi_pages` | `fqn` | Lightning ページ |
| `visualforce_pages` | `fqn` | Visualforce ページ |
| `visualforce_components` | `fqn` | Visualforce コンポーネント |
| `custom_applications` | `fqn` | カスタムアプリ |
| `dependencies` | `id` | メタデータ間の依存関係 |
| `tags` | `id` | 任意タグ (namespace + value) |

---

## 2. 主要テーブルのカラム

### `objects`

| カラム | 型 | 説明 |
|---|---|---|
| `fqn` | TEXT (PK) | 完全修飾名 (例: `Account`, `itemDetails__c`) |
| `label` | TEXT | ラベル |
| `plural_label` | TEXT | 複数形ラベル |
| `description` | TEXT | 説明 |
| `is_custom` | INTEGER | カスタムか (0/1) |
| `sharing_model` | TEXT | 共有モデル |
| `source_path` | TEXT | XML パス |
| `content_hash` | TEXT | コンテンツハッシュ |

### `fields`

| カラム | 型 | 説明 |
|---|---|---|
| `fqn` | TEXT (PK) | 例: `Account.Industry` |
| `object` | TEXT (FK→objects.fqn) | 所属オブジェクトの fqn |
| `label` | TEXT | ラベル |
| `description` | TEXT | 説明 |
| `type` | TEXT | データ型 |
| `required` | INTEGER | 必須か (0/1) |
| `is_unique` | INTEGER | 一意か (0/1) |
| `is_custom` | INTEGER | カスタムか (0/1) |
| `reference_to_json` | TEXT | 参照先 (JSON) |
| `picklist_values_json` | TEXT | 選択リスト値 (JSON) |
| `source_path` | TEXT | XML パス |
| `content_hash` | TEXT | コンテンツハッシュ |

### `validation_rules`

| カラム | 型 | 説明 |
|---|---|---|
| `fqn` | TEXT (PK) | 例: `Account.MyRule` |
| `object` | TEXT | 所属オブジェクト |
| `active` | INTEGER | 有効か (0/1) |
| `error_condition_formula` | TEXT | エラー条件式 |
| `error_message` | TEXT | エラーメッセージ |
| `error_display_field` | TEXT | エラー表示フィールド |
| `source_path` | TEXT | XML パス |
| `content_hash` | TEXT | コンテンツハッシュ |

### `flows`

| カラム | 型 | 説明 |
|---|---|---|
| `fqn` | TEXT (PK) | Flow 名 |
| `label` | TEXT | ラベル |
| `description` | TEXT | 説明 |
| `type` | TEXT | Flow タイプ (`Autolaunched`, `RecordTriggered` 等) |
| `status` | TEXT | `Active` / `Draft` / `Obsolete` |
| `triggering_object` | TEXT | レコード起動 Flow の対象オブジェクト |
| `source_path` | TEXT | XML パス |
| `content_hash` | TEXT | コンテンツハッシュ |
| `body_json` | TEXT | Flow 本体 (JSON) |

### `apex_classes`

| カラム | 型 | 説明 |
|---|---|---|
| `fqn` | TEXT (PK) | クラス名 |
| `api_version` | TEXT | API バージョン |
| `is_test` | INTEGER | テストクラスか (0/1) |
| `is_interface` | INTEGER | インタフェースか (0/1) |
| `is_abstract` | INTEGER | 抽象クラスか (0/1) |
| `lines_of_code` | INTEGER | LoC |
| `source_path` | TEXT | `.cls` パス |
| `content_hash` | TEXT | コンテンツハッシュ |
| `body_json` | TEXT | 解析メタ (JSON) |

### `apex_triggers`

| カラム | 型 | 説明 |
|---|---|---|
| `fqn` | TEXT (PK) | トリガ名 |
| `object` | TEXT | 対象オブジェクト |
| `events_json` | TEXT | 発火イベント配列 (JSON: `["before insert", ...]`) |
| `api_version` | TEXT | API バージョン |
| `source_path` | TEXT | `.trigger` パス |
| `content_hash` | TEXT | コンテンツハッシュ |
| `body_json` | TEXT | 解析メタ (JSON) |

### `permission_sets` / `profiles`

| カラム | 型 | 説明 |
|---|---|---|
| `fqn` | TEXT (PK) | 名前 |
| `label` (permission_sets) / `user_license` (profiles) | TEXT | 表示名 / ユーザライセンス |
| `description` (permission_sets) | TEXT | 説明 |
| `license` (permission_sets) | TEXT | ライセンス |
| `source_path` | TEXT | XML パス |
| `content_hash` | TEXT | コンテンツハッシュ |
| `body_json` | TEXT | 権限詳細 (JSON) |

### `dependencies`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER (PK) | サロゲートキー |
| `from_kind` | TEXT | 参照元の種類 (`apex_class`, `flow` など) |
| `from_fqn` | TEXT | 参照元 fqn |
| `to_kind` | TEXT | 参照先の種類 |
| `to_fqn` | TEXT | 参照先 fqn |
| `kind` | TEXT | 依存の種類 (`uses`, `triggers_on` など) |
| `evidence_path` | TEXT | 根拠となるソースパス |

### `tags`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER (PK) | サロゲートキー |
| `entity_kind` | TEXT | タグ対象種別 |
| `entity_fqn` | TEXT | タグ対象 fqn |
| `namespace` | TEXT | タグ名前空間 |
| `value` | TEXT | タグ値 |

> その他テーブル (`record_types`, `approval_processes`, `sharing_rules`, `layouts`, `custom_metadata_records`, `named_credentials`, `remote_site_settings`, `lwcs`, `aura_bundles`, `flexi_pages`, `visualforce_*`, `custom_applications`) も同様に `fqn` を主キーとし、構造化情報は `body_json` に JSON 文字列として格納される。完全な定義は `yohaku graph schema --tables` で取得すること。

---

## 3. 典型クエリのレシピ

### あるオブジェクトに紐づくトリガと Flow を一覧する

```sql
SELECT fqn, events_json
FROM apex_triggers
WHERE object = 'itemDetails__c';

SELECT fqn, type, status
FROM flows
WHERE triggering_object = 'itemDetails__c' AND status = 'Active';
```

### あるオブジェクトの全カスタムフィールド

```sql
SELECT fqn, label, type, required
FROM fields
WHERE object = 'itemDetails__c' AND is_custom = 1
ORDER BY fqn;
```

### 参照関係を逆引きする

```sql
SELECT from_kind, from_fqn, kind
FROM dependencies
WHERE to_kind = 'sobject' AND to_fqn = 'itemDetails__c';
```

### Active な検証ルールだけ抽出

```sql
SELECT fqn, error_message
FROM validation_rules
WHERE active = 1;
```

---

## 4. スキーマを実機で確認する

```bash
yohaku graph schema --tables           # 全テーブル × 全カラム (JSON)
yohaku graph schema --tables --table objects  # 特定テーブルのみ
yohaku graph schema --format markdown  # 既存: meta スキーマ (Markdown)
```

`PRAGMA` は `yohaku graph query` 経由では **発行できない**。スキーマ確認は必ず `yohaku graph schema --tables` を使うこと。
