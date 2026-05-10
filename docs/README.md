# docs/ — 利用者向け公開ドキュメント

OSS 利用者が読むためのドキュメント。リポジトリルートの `README.md` `IMPLEMENTATION_GUIDE.md` (= **メタ層 / 開発者向け**) とは対象読者が違う。

## ディレクトリ構成

```
docs/
├── 01-getting-started/    ← 30 分以内で導入完了する手順 (Phase 6)
├── 02-concepts/           ← 知識グラフ / 3 層分離 / 再現性ガバナンス等の概念解説
└── 03-reference/          ← CLI コマンド / subagent / slash command のリファレンス
```

## 計画されている主要ドキュメント

| ドキュメント | Phase | 内容 |
|---|---|---|
| `01-getting-started/quickstart.md` | Phase 6 | sfai init → sfai graph build → sfai render の最短手順 |
| `01-getting-started/profiles.md` | Phase 6 | minimal / standard / full の選び方 |
| `02-concepts/three-layer-separation.md` | Phase 2 以降 | 決定的処理 / AI / 人手の境界 |
| `02-concepts/reproducibility.md` | Phase 3 以降 | source 列・プロンプトハッシュ・ゴールデンテスト |
| `02-concepts/segments.md` | Phase 6 | 大企業 / 中小企業 / ベンダー それぞれの導入指針 |
| `03-reference/cli.md` | Phase 1 から育てる | `sfai` コマンド全リファレンス |
| `03-reference/subagents.md` | Phase 2 から育てる | 全 subagent の責務とツール権限 |
| `03-reference/commands.md` | Phase 2 から育てる | slash command 全リファレンス |

## 言語

- 当面は **日本語** (国内検証先行)
- 国際化 (英訳) は Phase 7 で検討

## 現状

ディレクトリ骨格のみ。中身は各 Phase で書き起こす。
