---
type: decision
date: 2026-05-07
title: change_summary 等の AI 生成スキーマに source 列 (deterministic / ai / human) を必須化
status: active
tags: [reproducibility, schema, three-layer, governance]
---

# AI 生成スキーマに `source` 列を必須化

## 判断

`change_summary` をはじめとする AI 関与スキーマの **各フィールドに `source: deterministic | ai | human` メタデータ**を持たせる。スキーマレベルで強制し、ajv バリデーションで未指定を弾く。

## 文脈

- 設計原則 1（3 層分離）の「同じ入力なら同じ出力なら決定的処理層」だけでは個別判断が依存者依存になる（H-2）。
- レビュー時にどのフィールドが AI 推測でどれが決定的計算か区別がつかないと、再現性検証も人手レビューも空回りする。

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **各フィールドに source 列を持たせる** | 採用 | スキーマで強制、レビュー・テストで活用可能 |
| B. ファイル冒頭に「全体は AI 生成」とだけ書く | 却下 | フィールド単位の検証に使えない |
| C. naming convention（`*_ai`, `*_det`）で区別 | 却下 | 機械検証しづらい、可読性が落ちる |

## 適用例

```yaml
change_summary:
  id: { value: "cs-2026-05-07-001", source: deterministic }
  scope_size: { value: "medium", source: deterministic }  # 行数・ファイル数から計算
  business_impact_hint:
    value: "顧客向け請求書フォーマットの変更により..."
    source: ai  # AI 推測
  customer_communication_needed:
    value: true
    source: human  # 人間が HUMAN_MANAGED ブロックで決定
```

## バリデーション

- 全フィールドに `source` を持つ wrapper を ajv の JSON Schema で必須化
- `source: deterministic` のフィールドは同じ入力で同じ値を返すゴールデンテストを必須化
- `source: ai` のフィールドは temperature=0 一致率 CI の対象
- `source: human` のフィールドは AI 再生成で上書きされない（HUMAN_MANAGED ブロックと連動）

## トレードオフ

- スキーマが冗長になる → 開発者向けには TypeScript の型ヘルパー（`Tracked<T>`）で wrap して使いやすくする
- 既存の同種設計が少ない → 本 OSS のオリジナル成果として README / IMPLEMENTATION_GUIDE で説明

## 影響範囲

- IMPLEMENTATION_GUIDE.md の Phase 3 change_summary スキーマ
- 再現性ガバナンス章（新設）
- ゴールデンテスト基盤の設計

## 関連ナレッジ

- [2026-05-07: IMPLEMENTATION_GUIDE.md v1.1 改訂方針](./2026-05-07-implementation-guide-revision-v1.1.md)
