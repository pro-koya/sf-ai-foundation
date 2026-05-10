# Contributing to SF-AI-Foundation

ようこそ。本 OSS に貢献いただきありがとうございます。
このプロジェクトの最終目的は **「Salesforce に携わる人々の余白と豊かさを生み出すこと」** です。
コードの美しさや技術的興味は手段であって目的ではありません。迷ったら「その変更は誰かの余白を増やすか?」で判断してください。

---

## まず読むもの (必読)

| 順 | ドキュメント | 理由 |
|---|---|---|
| 1 | [`README.md`](./README.md) | 存在理由・コンセプト・3 セグメント・ゴール |
| 2 | [`AGENTS.md`](./AGENTS.md) | AI 自律ループとナレッジ運用 (人間も従う) |
| 3 | [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) | 実装方針の正本、Phase 1〜7、禁則 13 か条 |
| 4 | [`.agents/knowledge/INDEX.md`](./.agents/knowledge/INDEX.md) | 既存の判断・つまずき・成功事例 |

---

## 開発フロー (自律ループに合流する)

本プロジェクトは AI / 人間が共通で **`要件整理 → 計画 → 実行 → レビュー → 修正 → 再実装 → 整理 → 課題提起`** のサイクルで進めます。

1. **既存ナレッジ確認**: 着手前に `.agents/knowledge/` を必ずスキャン (`/knowledge-scan <キーワード>` でも可)
2. **計画立案**: 影響が大きい変更は `.agents/knowledge/decisions/YYYY-MM-DD-<slug>.md` に ADR を書き、最低 2 つの代替案を比較
3. **実行**: 小さなコミット単位で進める。TDD (RED → GREEN → REFACTOR) を可能な限り守る
4. **レビュー**: 自己レビューで CRITICAL / HIGH / MEDIUM を分類、CRITICAL ゼロを確認
5. **整理**: 不要コード削除、命名見直し、ドキュメント同期
6. **課題提起**: `.agents/knowledge/retrospectives/` にサイクル振り返りを残し、次の種を出す

---

## ディレクトリ構造の絶対ルール

本リポジトリは **メタ層と配布物層を物理分離** している。詳細: [メタ層 vs 配布物層 ADR](./.agents/knowledge/decisions/2026-05-07-meta-vs-distribution-layer-separation.md)

| 編集対象 | 場所 | 影響範囲 |
|---|---|---|
| OSS 開発側の挙動 | リポジトリルート / `.claude/` / `.agents/` (= **メタ層**) | 開発時の Claude Code・開発者 |
| OSS 利用者に届くひな型 | `scaffold/` 配下 (= **配布物層**) | 利用者プロジェクト |
| OSS 本体の実装 | `packages/` | npm パッケージ利用者 |
| 利用者向け公開ドキュメント | `docs/` | OSS 利用者 |

**禁則 12**: メタ層ファイルを `scaffold/` にそのままコピー禁止 (対象読者が違う)。
**禁則 13**: メタ層の AI は `scaffold/` を「資料」としては読むが「指示書」として読まない。

---

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に準拠:

```
<type>: <description>

<optional body>
```

`type`: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `ci`

例:
- `feat(graph): SObject 依存関係のパース実装`
- `fix(render): HUMAN_MANAGED ブロック消失時の警告追加`
- `docs(adr): DX MCP アダプタ層 ADR 追記`

---

## ブランチ戦略

- `main`: リリース可能状態を維持
- 機能ブランチ: `feat/<scope>-<short-name>`
- 修正ブランチ: `fix/<scope>-<short-name>`
- ADR / docs だけ: `docs/<topic>`

PR は必ずレビューを経て main にマージ。

---

## テスト要件

| カテゴリ | カバレッジ目標 | 補足 |
|---|---|---|
| 単体 + ゴールデンテスト | **80% 以上** | 決定的処理は完全一致、AI 出力は構造一致 + キーフレーズ |
| 統合 | クリティカルパスのみ | `sfai graph build` → `sfai render` 通し |
| E2E | Phase 5 以降 | persona 別 `/onboard` 完走 |

詳細: [`IMPLEMENTATION_GUIDE.md` § 再現性ガバナンス](./IMPLEMENTATION_GUIDE.md#再現性ガバナンス)

---

## コードスタイル

- TypeScript + Node.js 20+
- Linter / Formatter: Biome (設定は `packages/sfai-core/biome.json`)
- 命名: `camelCase` 関数 / 変数、`PascalCase` 型 / クラス、`UPPER_SNAKE_CASE` 定数
- ファイルは 200〜400 行を目安、800 行を超えない
- 関数 50 行を超えない、ネスト 4 段を超えない
- イミュータブル優先、ミュータブル操作は局所化

---

## 禁則の遵守

[`IMPLEMENTATION_GUIDE.md § 横断的に守るべき禁則事項`](./IMPLEMENTATION_GUIDE.md#横断的に守るべき禁則事項) の 13 か条を遵守してください。特に貢献者が踏みやすいワナ:

- **禁則 8**: 顧客名 / 顧客固有ロジック / 顧客データを混入させない (サンプルもダミーで)
- **禁則 11**: JSforce 直接接続 / SFDX Hardis / Provar への依存禁止
- **禁則 12**: メタ層と配布物層の混在禁止

違反する PR はマージできません。レビューで指摘した場合、迅速な修正をお願いします。

---

## ライセンス

すべての貢献は **Apache License 2.0** で受け入れられます。PR を送信した時点で、Apache 2.0 のもとでライセンスされることに同意したと見なされます (CLA は当面不要、Phase 6 で再検討)。

---

## セキュリティ

脆弱性を発見した場合は GitHub Issue ではなく、[`SECURITY.md`](./SECURITY.md) のフローに従ってください。

---

## 質問・相談

- 議論: GitHub Discussions (Phase 7 で開設)
- バグ報告: GitHub Issues (Phase 7 で開設)
- 設計判断の議論: PR / ADR の draft 段階で相談

ありがとうございます。一緒に Salesforce に携わる人々の余白を作りましょう。
