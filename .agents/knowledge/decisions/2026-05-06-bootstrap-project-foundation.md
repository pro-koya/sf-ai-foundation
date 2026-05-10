---
type: decision
date: 2026-05-06
title: プロジェクト基盤 (CLAUDE.md / README.md / AGENTS.md / .claude / .agents) の初期構築
status: active
supersedes:
superseded_by:
tags: [bootstrap, governance, knowledge-system]
---

# プロジェクト基盤の初期構築

## 判断

`README.md` `CLAUDE.md` `AGENTS.md` の 3 文書と、`.claude/` `.agents/knowledge/` `.agents/templates/` のディレクトリ構造を初期構築し、AI 自律ループ (要件整理 → 計画立案 → 実行 → レビュー → 修正 → 再実装 → 整理 → 課題提起) と永続ナレッジ蓄積 (decisions / pitfalls / wins / improvements / retrospectives) を行動指針として確立する。

## 文脈

- 本 OSS の最終目的は「Salesforce に携わる人々の余白と豊かさを生み出すこと」
- 既に [`IMPLEMENTATION_GUIDE.md`](../../../IMPLEMENTATION_GUIDE.md) という詳細な実装方針書が存在するが、AI が日々の作業で参照すべき「行動指針」と「自己改善の仕組み」が未整備だった
- AI が単発タスクをこなすだけでなく、サイクル単位で学習を蓄えて自律的に改善し続けることが、長期にわたる OSS 開発の品質を担保する

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. CLAUDE.md / README.md / AGENTS.md を分離し、`.agents/knowledge/` を別建てで構築 | 採用 | 役割が明確に分離。CLAUDE.md は軽量に保ちつつ、ナレッジは構造化された別領域で永続化できる |
| B. すべてを CLAUDE.md に集約 | 却下 | IMPLEMENTATION_GUIDE.md § 設計原則 5 (CLAUDE.md は軽量に保つ、15KB 以内) に違反する |
| C. ナレッジを Git の commit message と issue で管理 | 却下 | AI が体系的に検索・参照しづらい。INDEX による横断検索が困難 |
| D. ナレッジを 1 ファイルの巨大 KNOWLEDGE.md に集約 | 却下 | 衝突・併合が辛く、`Status: Superseded` 運用と相性が悪い |

## トレードオフ

- **採用案の代償**: ファイル数・ディレクトリ数が増える。新規参画者にとって最初の見通しがやや悪くなる → INDEX.md と README で導線を明示してカバー
- **将来課題**: ナレッジが数百件規模になったときの検索戦略 (タグベース? 全文検索 CLI 化?) は未解決。Phase 5 以降で再検討

## 影響範囲

- 全 AI エージェント (Claude Code / Antigravity / Codex 等) の行動指針が確立
- 新規ファイル: `README.md` `CLAUDE.md` `AGENTS.md` `.gitignore`
- 新規ディレクトリ: `.claude/{commands,agents}/` `.agents/{knowledge/{decisions,pitfalls,wins,improvements,retrospectives},templates}/`
- 既存の [`IMPLEMENTATION_GUIDE.md`](../../../IMPLEMENTATION_GUIDE.md) は変更なし (実装方針の正本として温存)

## 関連ナレッジ

- (これが最初のエントリ。今後ここから派生する判断・つまずき・成功を関連付ける)
