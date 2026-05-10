---
type: retrospective
date: 2026-05-07
cycle: IMPLEMENTATION_GUIDE.md v1.0 → v1.1 改訂
phase: pre-Phase-1
tags: [governance, salesforce-ecosystem, reproducibility, segments]
---

# Retrospective: IMPLEMENTATION_GUIDE.md v1.0 → v1.1 改訂

## サイクル要約

Phase 1 着手前に、方針書 v1.0 を README のコンセプト軸（人の余白・ウェルネス、3 セグメント横断、再現性）に整合させ、Salesforce 公式エコシステム (DX MCP / Code Analyzer / ApexGuru / sf CLI / SDR) との責務境界を明文化した。アーキテクト評価で出た CRITICAL 4 / HIGH 6 / MEDIUM 7 / LOW 5 のうち、CRITICAL と HIGH は全件、MEDIUM と LOW は主要項目を反映。方針書は 862 → 1178 行 (約 37% 増)。新規 ADR を 6 件記録。

## 1. 要件整理 — 学び

- ユーザの依頼は「実装に入る前に方針書を改善し、Salesforce 公式 MCP / 品質ツールを活用方針に組み込む」。本質的な目的は **「実装が進んでから方針修正するコスト」を回避することと、コンセプト（余白・ウェルネス）と実装方針の乖離を防ぐこと**。
- 自分が事前に立てた AGENTS.md の自律ループに沿って `要件整理 → 計画立案 → (人間承認) → 実行` の順を厳守したのが効いた。ユーザの不安「本当に価値のあるものが作れるのか」に応える形で、評価サマリで意思決定を見える化できた。

## 2. 計画立案 — 学び

- 並列で **批判的レビュー (architect)** と **公式ツール調査 (general-purpose + WebSearch)** を走らせた判断は正解だった。順次だと 1.5〜2 倍の時間がかかった。
- 詳細 ADR: [v1.1 改訂方針](../decisions/2026-05-07-implementation-guide-revision-v1.1.md), [Apache 2.0](../decisions/2026-05-07-license-apache-2.0.md), [eta](../decisions/2026-05-07-template-engine-eta.md), [DX MCP アダプタ](../decisions/2026-05-07-dx-mcp-adapter-pattern.md), [Code Analyzer SARIF](../decisions/2026-05-07-code-analyzer-sarif-integration.md), [source 列](../decisions/2026-05-07-source-column-three-layer-boundary.md)
- ユーザに「Phase 2 必須統合 vs アダプタ層 (Phase 6)」の選択を投げたとき、トレードオフを先に提示してから推奨を述べた点は AGENTS.md § 4 に沿った良い接し方だった。

## 3. 実行 — 学び

- 1178 行の方針書を Edit ベースで段階的に書き換えるのは、新章追加（前後の文脈を壊さないアンカー選定）と既存章修正（ピンポイント差し替え）の使い分けが鍵。
- 章間アンカー (`#再現性ガバナンス` 等) のリンクを最初から張ったことで、相互参照が自然に成立した。
- `source` 列の wrapper 構造はスキーマが冗長になるが、ajv 強制と一致率 CI の前提として不可欠。最初のスキーマ実装時に TypeScript の `Tracked<T>` ヘルパーを必ず作る。

## 4. レビュー — 学び

- 方針書改訂は実装より「整合性チェック」が重い。`grep` で旧表現 (「Antigravity対応」「数秒」「70%以上」) を機械的に洗い出したのが時間短縮になった。
- 11 禁則の番号と本文がズレていないか、目次の章番号と本文の見出しが一致しているか、最後にまとめてチェックした。

## 5. 修正・再実装 — 学び

- 大きな手戻りなし。事前にユーザ承認をもらってから実行に入ったため、方針転換は不要だった。
- DX MCP のアダプタ判断はユーザに委ねたことで、Beta 仕様変動リスクを正面から扱えた。

## 6. 整理 — 学び

- INDEX.md への 1 行サマリ追加を都度行ったので最終整理は不要だった。`AGENTS.md § 2.4` のルール (新規追加時に必ず INDEX 更新) が機能した。
- 不要コード・コメントは発生せず（実装ではないため）。

## 7. 課題提起 — 次サイクルへの種

- [ ] **Phase 1 着手前準備**: Apache 2.0 ライセンス本文の `LICENSE` ファイル配置、`SECURITY.md` `CONTRIBUTING.md` の最小骨子作成、`package.json` 雛形（peerDependencies に sf CLI / SDR を宣言）
- [ ] **Phase 1 着手**: 知識グラフのスキーマ JSON Schema 化、HUMAN_MANAGED マージアルゴリズム ADR の本文執筆 (テストケース 6 件付き)、ゴールデンテスト基盤
- [ ] **再現性ガバナンスの実装初手**: `Tracked<T>` TypeScript ヘルパー、プロンプトハッシュ計算ユーティリティ、`tests/golden/` のディレクトリ構造定義
- [ ] **検証ゲート設計**: Phase 2 終了時に `/onboard` 完走させる「現役プロジェクト」の選定（私が参画中のプロジェクトを使う想定）
- [ ] **公式ツール統合の初手**: Code Analyzer v5 の SARIF サンプル取得、DX MCP の互換確認（オフライン読み取りだけでも一度起動）

## 良かった点 (Keep)

- **コンセプト軸への帰結を諦めなかった**: 技術設計に流されず「余白・ウェルネス」を方針書に常駐させた
- **公式エコシステムを敵対せず連携対象にした**: 重複実装の罠を回避できる構造になった
- **Beta ツール (DX MCP) はアダプタ層で隔離**: 仕様変動への耐性とコア独立性を両立
- **3 セグメントマトリクスを各 Phase に紐付け**: 機能追加判定の客観基準ができた
- **検証ゲートを早期 Phase に配置**: Phase 5 まで実ユーザ FB が無いリスクを排除

## 課題 (Problem)

- 方針書が 862 → 1178 行に膨らんだ。新規参画者が読み切れない懸念。**Phase 6 で TL;DR セクションを追加する** か、トップに 1 ページ要約を作るかを次サイクルで検討
- KPI（運用タスク AI 任せ可能比率、ストレス指標 NPS など）の **計測手段が未確定**。Phase 2 の検証ゲートで具体化する必要あり
- Code Analyzer v5 の SARIF パーサ選定が未決。Phase 3 着手前に決める必要

## 試したいこと (Try)

- `sfai metrics` の最初のプロトタイプを Phase 1 と並行で書く（人間側 KPI 計測の早期着手）
- DX MCP の動作確認を Phase 2 の検証ゲートで「DX MCP を持っていない利用者でも本 OSS が動く」テストとして追加
- 一致率 CI の閾値を Phase 3 では 80%、Phase 7 では 95% に設定するロードマップ可視化

## 蓄積された関連ナレッジ

- decisions:
  - [2026-05-06 プロジェクト基盤の初期構築](../decisions/2026-05-06-bootstrap-project-foundation.md)
  - [2026-05-07 v1.1 改訂方針](../decisions/2026-05-07-implementation-guide-revision-v1.1.md)
  - [2026-05-07 Apache 2.0](../decisions/2026-05-07-license-apache-2.0.md)
  - [2026-05-07 eta 確定](../decisions/2026-05-07-template-engine-eta.md)
  - [2026-05-07 DX MCP アダプタ](../decisions/2026-05-07-dx-mcp-adapter-pattern.md)
  - [2026-05-07 Code Analyzer SARIF](../decisions/2026-05-07-code-analyzer-sarif-integration.md)
  - [2026-05-07 source 列必須化](../decisions/2026-05-07-source-column-three-layer-boundary.md)
- pitfalls: (今サイクルでは無し。実装フェーズで増える想定)
- wins: (今サイクルでは無し。実装で「何が効いたか」が現れたら追記)
- improvements: (今サイクルでは無し。実装で見つけたら追記)
