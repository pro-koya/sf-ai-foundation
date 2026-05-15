---
type: decision
date: 2026-05-07
title: Salesforce Code Analyzer v5 の SARIF 出力を差分分類器の入力として取り込む
status: active
tags: [salesforce-ecosystem, code-analyzer, sarif, phase-3, quality]
---

# Code Analyzer v5 の SARIF 出力を差分分類器の入力として取り込む

## 判断

Salesforce 公式の **Code Analyzer v5** (`@salesforce/plugin-code-analyzer`) は本 OSS に**再実装しない**。Phase 3 の `/classify-diff` フローで Code Analyzer の **SARIF 出力を入力として読み込む** step を追加する。`.code-analyzer.yml` はプロジェクト所有とし、本 OSS は強制しない。

## 文脈

- Code Analyzer v5 は PMD (Apex)、ESLint (JS/LWC)、RetireJS、Regex、Lightning Flow Scanner を統合した公式静的解析。
- v4 は 2025-08 retire 済みで v5 が現行。
- 本 OSS の「レビュー観点提示」は **業務的・差分文脈的**（例: ピックリスト追加 → 既存レコード補完が必要）であり、Code Analyzer の **構文・静的ルール**とは層が違う。

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **SARIF 入力として連携** | 採用 | 業界標準フォーマット、決定的、車輪の再発明回避 |
| B. 本 OSS で静的ルールを再実装 | 却下 | Salesforce 公式と重複、保守負荷、差別化喪失 |
| C. Code Analyzer を完全無視 | 却下 | 利用者が二重作業を強いられる、公式品質基準と乖離 |

## 設計の最小骨子

- Phase 3 の `data-model-classifier` / `automation-classifier` / `permission-classifier` / `ui-classifier` / `logic-classifier` は、**入力に SARIF レポートをオプションで取れる** ように設計する
- `change_summary` スキーマに `static_analysis_findings: SarifResult[]` フィールドを追加（任意）
- 本 OSS の subagent system prompt に「**静的解析違反は Code Analyzer に委譲、本 subagent は業務影響に集中**」を明記
- `yohaku diff --include-static-analysis` オプションで Code Analyzer 連動を有効化

## トレードオフ

- Code Analyzer v5 が利用者の環境に未導入だと連動できない → README の推奨環境セクションに明記、未導入でも本 OSS は動作する（findings が空になるだけ）
- SARIF パーサが必要 → `@microsoft/sarif-multitool` 等の既存ライブラリで対応可

## 影響範囲

- IMPLEMENTATION_GUIDE.md Phase 3 章を改訂
- `change_summary` JSON Schema に `static_analysis_findings` 追加
- 公式エコシステムとの責務境界章で Code Analyzer の住み分けを表に明示

## 関連ナレッジ

- [2026-05-07: IMPLEMENTATION_GUIDE.md v1.1 改訂方針](./2026-05-07-implementation-guide-revision-v1.1.md)
- [2026-05-07: DX MCP Server アダプタ層](./2026-05-07-dx-mcp-adapter-pattern.md)
