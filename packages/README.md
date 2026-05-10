# packages/ — OSS 本体ソース (monorepo 構成)

将来的なパッケージ分割可能性を残した monorepo 構造。最初は `sfai-core` のみ。Phase 2 以降で必要に応じて分割する。

## 計画されているパッケージ

| パッケージ | Phase | 概要 |
|---|---|---|
| `sfai-core` | Phase 1 | CLI + 知識グラフビルダー + render エンジン + ゴールデンテスト基盤 |
| `sfai-prompts` (検討) | Phase 2 以降で分割検討 | subagent / slash command のシステムプロンプト集 |
| `sfai-adapters-dx-mcp` (検討) | Phase 6 | Salesforce DX MCP Server アダプタ |

## 監修フレームワーク

- **言語**: TypeScript + Node.js 20+
- **テスト**: vitest + ゴールデンテスト
- **Lint/Format**: Biome
- **ビルド**: tsup または tsc 直
- **配布**: npm + Claude Code Plugin

詳細は [`/IMPLEMENTATION_GUIDE.md`](../IMPLEMENTATION_GUIDE.md) の Phase 1 / 6 を参照。

## 現状

**空**。Phase 1 着手で `sfai-core/` を作成する。
