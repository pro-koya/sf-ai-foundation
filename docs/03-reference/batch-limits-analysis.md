# Batch Limits Analysis (`/analyze-batch-limits`)

> 対象オブジェクトのトリガ処理（Apex + Record-Triggered Flow + DML カスケード）を **静的解析だけで** 追跡し、Salesforce ガバナ制限 (SOQL 100 / DML 150 / 行 50,000) に照らして「データ連携でこのオブジェクトに突っ込める安全なバッチサイズ」を算出する仕組み。

---

## 1. 何ができるか

`/analyze-batch-limits <ObjectApiName>` を Claude Code から叩くと、以下が自動で行われる:

1. 対象オブジェクトのトリガ・アクティブ Flow を `yohaku graph query` で列挙
2. DML カスケードを再帰追跡し、同一トランザクション内で発火するトリガチェーンを Lv.0 → Lv.N で確定
3. 各レベルの Apex / Flow を並列解析し、SOQL / DML を A/B/C/D に分類
4. カスケード上流→下流のフィールド照合で「条件付き発火」を確定
5. ガバナ制限ベースの **最大バッチ許容件数** を Insert / Update シナリオ別に算出
6. `docs/ai-augmented/batch-analysis/<YYYY-MM-DD>-<ObjectApiName>.md` にレポート出力

---

## 2. 構成 (4 agent + 1 command)

```
/analyze-batch-limits <ObjectApiName>   ← scaffold/.claude/commands/
        │
        ├─→ cascade-tracer              ← DML カスケード再帰追跡 (sonnet)
        │
        ├─→ apex-query-tracer (×全レベル並列)  ← Apex の SOQL/DML 分類 (sonnet)
        ├─→ flow-query-tracer (×全レベル並列)  ← Flow XML の SOQL/DML 分類 (haiku)
        │
        └─→ batch-calculator            ← ガバナ制限逆算 (haiku)
```

各 agent は `scaffold/.claude/agents/` に同梱され、`yohaku init` で配置される。

---

## 3. クエリ分類の規約

### SOQL

| 分類 | 意味 | 例 |
|---|---|---|
| A | ゼロカウント | `__mdt` の LTA なしクエリ、Custom Setting 静的アクセス |
| B | 固定（バッチサイズ非依存） | `WHERE Id IN :ids`、Flow のループ外 Get Records |
| C | バッチ比例 (N) | `for(Trigger.new){ [SELECT...] }` 等、ループ内 SOQL |
| D | 紐づき比例 (M×N) | ネストループ内 SOQL |

### DML

| 分類 | 意味 |
|---|---|
| DML_B | 固定 DML（ループ外） |
| DML_C | バッチ比例 DML（ループ内）⚠ アンチパターン |
| DML_D | 紐づき比例 DML（ネストループ内）⚠ アンチパターン |

> **Database.executeBatch / enqueueJob / @future は別トランザクション**、ガバナ制限カウントから除外。

---

## 4. Salesforce 特有の落とし穴 (本パックで明示的に対処済み)

### Flow Get Records のバルク化

Record-Triggered Flow の `<recordLookups>` は、ループ **外** にあれば常に B 分類。
N 件同時トリガでも Salesforce が 1 回の SOQL にまとめる仕様だからである。
`WHERE ParentId = {!$Record.Id}` のような `$Record` 依存フィルタでも B が正しい。

→ `flow-query-tracer` がこの仕様を組み込み済み。`<loops>` 要素の内側にあるかどうかだけで C/D 判定する。

### `__mdt` Long Text Area の判定

`__mdt` クエリは原則ゼロカウント (A) だが、SELECT 句に **LongTextArea 型** フィールドを含むと B 算入される。
`Textarea` (255 文字) と `LongTextArea` は別物。本パックは `type='LongTextArea'` を `yohaku graph query` で確認してから判定する。

### Apex トリガの `events_json`

知識グラフでは `apex_triggers.events_json` に JSON 配列 (`["before insert", "after update"]`) で格納される。
本パックは `events_json` をパースして Insert / Update シナリオを分けて分析する。

### カスケード条件のクロスチェック

「上流が更新するフィールド」と「下流の `IsChanged` 条件」を **フィールドレベルで照合** してから発火可否を確定する。
「集計パスでは不発火」のような断定は照合完了後にしか書けない (推測禁止)。

---

## 5. 出力レポートの構造

```markdown
# バッチ許容件数分析: <ObjectApiName>

## カスケードチェーン            ← cascade-tracer の出力
## アクティブフロー発火分析      ← flow-query-tracer (Insert/Update 別)
## カスケード条件クロスチェック  ← Lv.N → Lv.N+1 のフィールド照合
## クエリ数マトリクス (INSERT)
## クエリ数マトリクス (UPDATE)
## DML 数マトリクス (INSERT)
## DML 数マトリクス (UPDATE)
## 最大バッチ許容件数
## 判定                          ← 推奨バッチサイズ、ボトルネック
## 要対応事項                    ← 未計上・要確認の TODO
```

---

## 6. 使い方

```bash
# 1) 知識グラフを最新化
yohaku sync --quiet

# 2) Claude Code 内で
/analyze-batch-limits MyObject__c

# 3) レポートを確認
ls docs/ai-augmented/batch-analysis/
```

実行前提:

- `.yohaku/graph.sqlite` がビルド済み (`yohaku graph build` を実行済み)
- `force-app/` に対象オブジェクトのメタデータ XML / Apex / Flow が揃っている
- Claude Code (or 互換ハーネス) が `scaffold/.claude/agents/`, `scaffold/.claude/commands/` を読める状態

---

## 7. 既知の限界

- **動的 SOQL は推測しない**: `Database.query(buildSoqlString(...))` で文字列組み立て後にクエリされている場合、本パックは「[要調査]」と記して合計から除外する
- **マネージドパッケージの内部 SOQL は不可視**: namespace 違いのクラスの内部実装は読めないため、合計から除外
- **Apex Test クラスは対象外**: `is_test = 1` のクラスは集計しない
- **Process Builder は Flow と同等に扱う**: ただし旧 Process Builder の XML 形式は完全には対応していない場合がある

---

## 8. 関連

- スキーマ正本: [`knowledge-graph-schema.md`](./knowledge-graph-schema.md)
- パフォーマンス: [`performance.md`](./performance.md) (このパックは `--async` の hook と独立して動く)
