# @sf-ai-foundation/sfai-core

Core CLI and knowledge graph engine for [SF-AI-Foundation](../../README.md).

> **Status**: Phase 1 着手 (実装開始前のスケルトンのみ)。実装は順次進める。

## 責務

- Salesforce DX ソース (`force-app/`) → SQLite 知識グラフ (`.sfai/graph.sqlite`)
- 知識グラフ → 決定的な Markdown 派生物 (`docs/generated/`)
- 入力ソース層の抽象化 (`LocalSourceAdapter` を Phase 1 で実装、`DxMcpSourceAdapter` を Phase 6 で追加)

## CLI

```
sfai graph build [--incremental] [--source local|dx-mcp]
sfai graph query <sql>
sfai graph schema [--format json|markdown]
sfai render <target> [--output <path>]
sfai validate <target>
sfai diff --from <ref> --to <ref> [--json]
sfai metrics [--period day|week|month]
sfai version
```

## ディレクトリ構造 (計画)

```
packages/sfai-core/
├── package.json
├── tsconfig.json / tsconfig.build.json
├── vitest.config.ts
├── biome.json
├── src/
│   ├── cli.ts                       (Phase 1 で実装)
│   ├── index.ts                     (公開 API)
│   ├── types/                       (TypeScript 型定義)
│   │   ├── graph.ts
│   │   ├── source-adapter.ts
│   │   └── render.ts
│   ├── schema/                      (JSON Schema 正本)
│   │   └── graph.schema.json
│   ├── merge/                       (HUMAN_MANAGED マージロジック)
│   │   └── (Phase 1 で実装)
│   ├── adapters/
│   │   └── local/                   (LocalSourceAdapter)
│   ├── graph/                       (SQLite 操作)
│   └── render/                      (eta テンプレート描画)
└── tests/
    ├── unit/
    └── golden/
```

## 設計原則

1. **3 層分離**: 決定的処理は本パッケージで担う。AI 推測はここに混ぜない。
2. **入出力の決定的性**: 同一入力 → 同一出力 をハッシュで検証 (ゴールデンテスト)
3. **`force-app/` を読むだけ・書かない**: Layer 1 (正本) を侵さない
4. **knowledge graph は CLI 経由でしか書き換えない**: AI / hooks から直接 INSERT 禁止

## 関連ドキュメント

- [`/IMPLEMENTATION_GUIDE.md`](../../IMPLEMENTATION_GUIDE.md) — 実装方針正本
- [`/AGENTS.md`](../../AGENTS.md) — 自律ループ
- [`/CONTRIBUTING.md`](../../CONTRIBUTING.md) — 開発フロー
