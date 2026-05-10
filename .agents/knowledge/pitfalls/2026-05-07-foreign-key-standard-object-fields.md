---
type: pitfall
date: 2026-05-07
title: 標準オブジェクトに対する Custom Field で FOREIGN KEY 制約失敗 (修正済)
severity: high
tags: [phase-2, sqlite, foreign-key, salesforce-dx, standard-object]
---

# 標準オブジェクトに対する Custom Field で FK 制約失敗

## 何が起きたか

Salesforce DX プロジェクトで `objects/Account/fields/MyCustom__c.field-meta.xml` のように **標準オブジェクトに Custom Field を追加** したケースで `sfai graph build` が `Error: FOREIGN KEY constraint failed` で停止。

## 根本原因

- `fields` テーブルは `object` カラムに `FOREIGN KEY (object) REFERENCES objects(fqn)` を持つ
- Salesforce DX では **標準オブジェクトの `.object-meta.xml` は通常存在しない** (Account は標準なので再定義不要)
- 結果: `Account.MyCustom__c` を INSERT しようとすると、`objects` 表に `Account` 行が無く FK 失敗

これは Salesforce DX の **典型的なパターン** であり、利用者プロジェクトの大多数で発生する想定。Phase 2 サイクル 2-7 まで気づかなかった理由は smoke project / sample-project が Custom Object のみ使っていたため。

## 修正

`packages/sfai-core/src/graph/builder.ts` に `ensureReferencedObjectStubs` を追加し、`fields` / `validationRules` / `apexTriggers` が参照する親オブジェクトのうち `objects` 配列に未登録のものを **stub として自動生成**:

```typescript
function ensureReferencedObjectStubs(
  objects: SObject[],
  fields: readonly Field[],
  validationRules: readonly ValidationRule[],
  apexTriggers: readonly ApexTrigger[],
): void {
  const existing = new Set(objects.map((o) => o.fullyQualifiedName));
  const referenced = new Set<string>();
  for (const f of fields) referenced.add(f.object);
  for (const v of validationRules) referenced.add(v.object);
  for (const t of apexTriggers) referenced.add(t.object);

  for (const ref of referenced) {
    if (existing.has(ref)) continue;
    objects.push({
      fullyQualifiedName: ref,
      label: ref,
      isCustom: ref.endsWith("__c"),
      sourcePath: `<inferred:standard-or-managed-object>/${ref}`,
      contentHash: "sha256:inferred",
    });
  }
}
```

`sourcePath` は `<inferred:...>/Account` 形式で **派生 stub** であることを示す (派生 vs ローカル meta.xml 由来を区別可能)。

## 検証

```bash
mkdir -p /tmp/sfai-fk-test/force-app/main/default/objects/Account/fields
# (sfdx-project.json + Account/fields/MyCustom__c.field-meta.xml を配置)
sfai graph build
# → [sfai] graph build complete: objects=1 fields=1 (Account stub が生成される)
sfai graph query "SELECT fqn, source_path FROM objects"
# → "Account" が "<inferred:standard-or-managed-object>/Account" として登録
```

## 再発防止

1. **smoke / sample-project に標準オブジェクト + 追加フィールドのケースを追加** (improvement)
2. **Phase 7**: 標準オブジェクト一覧 (Account, Contact, Lead, Opportunity, Case, ...) を持って明示的に判定する仕組み (現状は `__c` で終わらないものは "standard-or-managed" と総称)
3. **Phase 5**: `Managed Package` 由来オブジェクト (`namespace__Object__c`) と standard を区別

## 関連ナレッジ

- pitfalls/[CI / E2E バグ 8 件](./2026-05-07-ci-and-e2e-bugs.md)
- pitfalls/[symlink isDirectInvoke バグ](./2026-05-07-symlink-isDirectInvoke-bug.md)
- decisions/[Phase 1 完了宣言](../decisions/2026-05-07-phase-1-completion.md) — このパターンは Phase 1 既知制約として隠れていた

## 利用者への対応

修正コミット + `npm run build` 済み。symlink 経由で即反映。**追加操作なしで** 動作する。
