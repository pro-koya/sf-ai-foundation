---
type: decision
date: 2026-05-07
title: テンプレートエンジンを eta に確定
status: active
tags: [phase-1, technology-stack]
---

# テンプレートエンジンを eta に確定

## 判断

`sfai render` のテンプレートエンジンに **eta** (https://eta.js.org/) を採用する。

## 文脈

- v1.0 では「Phase 1 序盤で決定」と先送りされていた（L-2）。
- 方針書を Implementation Ready と称する以上、着手前に確定すべき。

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **eta** | 採用 | 軽量 (≈3KB)、TypeScript 親和、EJS 互換構文で学習コスト低、async サポート、メンテ活発 |
| B. handlebars | 却下 | ロジックレス過ぎて 3 種ブロック挿入のヘルパー追加コストが嵩む |
| C. EJS 本家 | 却下 | eta と同系統だが eta の方が軽量・モダン |
| D. Liquid (LiquidJS) | 却下 | Salesforce / Shopify 系で人気だが本 OSS の主目的にはオーバースペック |
| E. 独自テンプレート | 却下 | 車輪の再発明、保守負荷増 |

## トレードオフ

- eta は EJS ほど世間的に普及していない → README で技術選定理由を明記
- プラグインエコシステムは小さい → 本 OSS が必要とする機能（部分テンプレート、async）はコアでカバー可能

## 影響範囲

- `package.json` に `eta` を依存追加
- `templates/` 配下のファイル拡張子は `.eta`
- 3 種ブロック (DETERMINISTIC / AI_MANAGED / HUMAN_MANAGED) の挿入は eta のヘルパー関数で実装

## 関連ナレッジ

- [2026-05-07: IMPLEMENTATION_GUIDE.md v1.1 改訂方針](./2026-05-07-implementation-guide-revision-v1.1.md)
