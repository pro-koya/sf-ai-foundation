---
type: decision
date: 2026-05-07
title: IMPLEMENTATION_GUIDE.md v1.1 改訂方針 (コンセプト整合・公式エコ統合・再現性強化)
status: active
supersedes:
superseded_by:
tags: [governance, salesforce-ecosystem, reproducibility, segments, wellness-kpi]
---

# IMPLEMENTATION_GUIDE.md v1.1 改訂方針

## 判断

`IMPLEMENTATION_GUIDE.md` を v1.0 → v1.1 に改訂する。改訂の柱は次の 6 つ。

1. **コンセプト軸（人の余白・ウェルネス）を方針書に常駐させる** — 各 Phase に「人間側 KPI」を必須項目化
2. **3 セグメント（大企業 / 中小企業 / ベンダー）への価値マッピング章を新設**
3. **再現性ガバナンス章を新設** — プロンプト=コード扱い、ゴールデンテスト、`source` 列、temperature=0 一致率 CI
4. **Salesforce 公式エコシステムとの責務境界章を新設** — DX MCP Server / Code Analyzer v5 / ApexGuru / sf CLI / SDR との関係を明文化、JSforce 直接接続・SFDX Hardis・Provar を禁則 11 で禁忌化
5. **AI コストとセキュリティ方針章を新設** — モデル選定ポリシー、Haiku 自動退避、PII マスキング、`.sfai/` 暗号化方針
6. **検証ゲート（実ユーザ検証）を Phase 2/3/4 にも配置**

加えて、Phase 別の小修正（カバレッジ 80% 統一、ライセンス Apache 2.0 即決、テンプレートエンジン eta 確定、`sfai graph schema` 追加、hooks 閾値 500ms 統一、Antigravity の Phase 6 互換確認、Phase 7 KPI 定量化、ナレッジ層を Phase 2 から運用）を行う。

## 文脈

- v1.0 は 2026-04-18 作成。技術設計は緻密だが、`README.md` で宣言したコンセプト（余白・豊かさ・ウェルネス、3 セグメント横断、再現性、ベンダーへの再現性提供）が方針書に十分反映されていなかった。
- 並行して、Salesforce が 2025〜2026 にかけて DX MCP Server / Code Analyzer v5 / ApexGuru (DX MCP 経由) / Agentforce DX を矢継ぎ早にリリースしており、これらを「重複実装する罠」を避ける必要があった。
- アーキテクト評価で CRITICAL 4 件 / HIGH 6 件 / MEDIUM 7 件 / LOW 5 件が抽出された。Phase 1 着手前にこれを解消する判断。

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. v1.0 のまま Phase 1 に着手し、実装中に学んだ点で v1.1 へ進化 | 却下 | コンセプト軸の欠落は実装が進むほど補正コストが増える。早期是正が安価 |
| B. 改訂を行うが、Salesforce DX MCP 統合は Phase 6 のアダプタ層として後付けで導入 | **採用** | Beta 仕様変動への耐性、本 OSS のコア（知識グラフ + 差分意味づけ）の独立成立、最小導入パス（H-4）との整合 |
| C. Salesforce DX MCP を Phase 2 で必須統合 | 却下 | Beta 仕様の破壊的変更リスク、本 OSS のオフライン構造分析という差別化を曖昧にする |
| D. Code Analyzer v5 の機能を本 OSS で再実装 | 却下 | 公式重複・保守負荷・差別化喪失。Code Analyzer の SARIF を入力として活用する設計に |

## トレードオフ

- **採用案の代償**:
  - 着手が 1〜2 日遅れる（Phase 1 の作業開始日が後退）
  - 方針書の章数が 4 つ増え、新規参画者の読了コストが上がる → 章冒頭の 1 行サマリと各章へのアンカーリンクで緩和
  - DX MCP アダプタ層は Phase 6 まで未実装 → Phase 2〜5 で「DX MCP 互換性を意識した抽象化」だけは事前に行う
- **将来課題**:
  - Code Analyzer v5 の SARIF 入力対応は Phase 3 のスコープに含めるが、ApexGuru 連携は Phase 4 以降に押し出す可能性あり
  - 人間側 KPI の測定方法（時間削減 [h/週] の取り方）は Phase 2 の検証ゲートで具体化

## 影響範囲

- 改訂対象: `IMPLEMENTATION_GUIDE.md`（全章にわたる加筆・修正、行数は 862 → 推定 1100〜1200）
- 不変: `README.md` `CLAUDE.md` `AGENTS.md`（v1.0 で確立した行動指針はそのまま）
- 派生 ADR: 別途追加予定（テンプレート eta 確定、ライセンス Apache 2.0、3 層境界 source 列、DX MCP アダプタ層、Code Analyzer SARIF 取り込み）

## 関連ナレッジ

- [2026-05-06: プロジェクト基盤の初期構築](./2026-05-06-bootstrap-project-foundation.md)
- 派生予定: `2026-05-07-license-apache-2.0.md`, `2026-05-07-template-engine-eta.md`, `2026-05-07-dx-mcp-adapter-pattern.md`, `2026-05-07-code-analyzer-sarif-integration.md`, `2026-05-07-source-column-three-layer-boundary.md`
