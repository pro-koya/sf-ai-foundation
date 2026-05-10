---
type: decision
date: 2026-05-07
title: Salesforce DX MCP Server はアダプタ層として後付け統合する
status: active
tags: [salesforce-ecosystem, mcp, architecture, phase-6]
---

# Salesforce DX MCP Server はアダプタ層として後付け統合する

## 判断

Salesforce 公式の **Salesforce DX MCP Server** (Apache 2.0、2025-05 Developer Preview、2026 時点 Beta) は、本 OSS にハード依存させず **`adapters/dx-mcp/` というアダプタ層** として Phase 6 で実装する。Phase 2〜5 では DX MCP との互換性を意識した抽象化（インターフェース層）だけ事前に作る。

## 文脈

- DX MCP Server は 60+ ツール（orgs / metadata / data / users / testing / code-analysis / lwc-experts / scale-products / devops 等）を提供し、ライブ org への即時アクセスを LLM に与える。
- 本 OSS の核は「**オフライン構造分析 + 派生ドキュメント生成 + 差分意味づけ**」で、ライブ org 接続は必須ではない。
- DX MCP はまだ Beta で API が流動的。ハード依存はリスクが高い。
- 一方、利用者の中には「ローカルに `force-app/` を持たないが、組織にはアクセスできる」ケースも存在する。アダプタで吸収できれば導入の敷居が下がる。

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **アダプタ層として Phase 6 で導入** | 採用 | Beta 仕様変動への耐性、本 OSS のオフライン独立性を保てる、最小導入パスと整合 |
| B. Phase 2 から DX MCP に必須統合 | 却下 | Beta 破壊的変更で本 OSS が連鎖的に壊れる、オフライン独立性を失う |
| C. DX MCP を完全に無視 | 却下 | 公式エコシステムとの相互運用性を失い、利用者に二重の作法を強いる |

## アダプタ設計の最小骨子

```
sfai-core
   │
   ├── 入力ソース層 (interface)
   │     ├── LocalSourceAdapter   (force-app/ を読む、デフォルト)
   │     └── DxMcpSourceAdapter   (DX MCP の metadata toolset 経由、Phase 6)
   │
   └── グラフビルダー (両アダプタ共通)
```

- 入力ソース層に共通 IF (`fetchMetadata(types) -> ComponentSet`) を切る（Phase 2）
- LocalSourceAdapter のみ Phase 1〜5 で実装
- DxMcpSourceAdapter は Phase 6 で追加し、`sfai init --source dx-mcp` で切り替え可能に

## トレードオフ

- 抽象化を Phase 2 で先回りすることで Phase 1〜5 の実装に多少のオーバーヘッド → 後付けで分離するより安価
- DX MCP の Beta 仕様変更は依然リスク → アダプタ実装時にバージョン互換マトリクスを必須化

## 影響範囲

- IMPLEMENTATION_GUIDE.md の Phase 2 / Phase 6 を改訂
- 公式エコシステムとの責務境界章を新設し、DX MCP / sf CLI / SDR / Code Analyzer / ApexGuru の住み分けを表で明示
- `禁則 11` を新設して JSforce 直接接続を禁忌化（DX MCP / sf CLI / SDR が org アクセスの唯一の窓口）

## 関連ナレッジ

- [2026-05-07: IMPLEMENTATION_GUIDE.md v1.1 改訂方針](./2026-05-07-implementation-guide-revision-v1.1.md)
- 派生予定: `2026-05-07-code-analyzer-sarif-integration.md`
