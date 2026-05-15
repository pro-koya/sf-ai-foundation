# tests/golden/

`@yohakuforce/core` のゴールデンテスト。詳細仕様: [`/tests/golden/README.md`](../../../../tests/golden/README.md)。

## このパッケージ用のレイアウト

```
tests/golden/
├── render/                  ← HUMAN_MANAGED マージアルゴリズムのケース 1〜6
│   ├── case-1-no-existing-file/
│   ├── case-2-blocks-coexist/
│   ├── case-3-human-block-missing/
│   ├── case-4-entity-rename/
│   ├── case-5-entity-deleted/
│   └── case-6-marker-corruption/
└── graph/                   ← graph build の入出力 SQLite snapshot (将来)
```

## 受け入れ基準

| 区分 | 基準 |
|---|---|
| 決定的フィールド (`source: deterministic`) | 同一入力で **100% 一致** |
| AI フィールド (`source: ai`) | JSON Schema 100% 適合 + キーフレーズ含有 + 一致率 80% 以上 (Phase 3) |

## 関連 ADR

- [HUMAN_MANAGED マージアルゴリズム仕様](../../../../.agents/knowledge/decisions/2026-05-07-human-managed-merge-algorithm.md)

## 現状

ディレクトリ構造のみ確定。各ケースの入力 / 期待出力ペアは Phase 1 のマージ実装と並行して配置する。
