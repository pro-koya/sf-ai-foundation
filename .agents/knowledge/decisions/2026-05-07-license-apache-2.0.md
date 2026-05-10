---
type: decision
date: 2026-05-07
title: ライセンスを Apache 2.0 に確定
status: active
tags: [license, governance, oss]
---

# ライセンスを Apache 2.0 に確定

## 判断

本 OSS のライセンスを **Apache License 2.0** に確定する。Phase 1 着手前に決定し、`LICENSE` ファイルを作成する。

## 文脈

- v1.0 ではライセンスを Phase 6 まで先送りしていた（M-4）。
- しかし Phase 1 着手前チェックリストに「LICENSE 選定済み」が含まれており矛盾していた。
- OSS としての姿勢を早期に表明することで、コントリビューションの余地・依存ツールとの整合・社内展開時の説明コストを下げられる。

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **Apache 2.0** | 採用 | 特許条項あり、企業利用に親和的、Salesforce 公式 (sf CLI / SDR / Code Analyzer はいずれも BSD-3 や Apache 2.0 系) と整合、コミュニティ標準 |
| B. MIT | 却下 | 軽量だが特許条項が無く、企業利用 / コンサル展開時の特許リスク説明が弱い |
| C. MPL 2.0 / LGPL 等 copyleft 系 | 却下 | 商用組み込み・ベンダー再配布への摩擦が大きい |
| D. AGPL | 却下 | SaaS 向け強条件で本 OSS の用途と合わない |

## トレードオフ

- Apache 2.0 は MIT より文章量が多く、`LICENSE` `NOTICE` 両方を整える運用負荷がある → Phase 6 で `NOTICE` 自動生成を検討
- 著作権表示と変更告知の責務が利用者に発生する → README に明記

## 影響範囲

- ルート直下に `LICENSE` を配置（Phase 1 着手前）
- README / IMPLEMENTATION_GUIDE / package.json (将来) でライセンスを宣言
- 依存ライブラリのライセンス互換性を Phase 1 でチェック

## 関連ナレッジ

- [2026-05-07: IMPLEMENTATION_GUIDE.md v1.1 改訂方針](./2026-05-07-implementation-guide-revision-v1.1.md)
