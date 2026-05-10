# tests/golden/ — ゴールデンテスト基盤

[再現性ガバナンス](../../IMPLEMENTATION_GUIDE.md#再現性ガバナンス) 層 3 で定義した **ゴールデンテスト** の入出力ペアを格納する。

## 想定構成 (Phase 1 で確定)

```
tests/golden/
├── deterministic/          ← source: deterministic フィールドの完全一致テスト
│   ├── graph-build/        ←   sfai graph build の入出力 SQLite snapshot
│   ├── render/             ←   sfai render の入出力 Markdown
│   └── diff/               ←   sfai diff の入出力 JSON (Phase 3 から)
├── ai/                     ← source: ai フィールドの構造一致 + キーフレーズチェック
│   ├── classify-diff/      ←   /classify-diff の入出力 (Phase 3 から)
│   └── ...
└── consistency/            ← AI 出力一致率 CI 用 (temperature=0、N 回再実行)
    └── runs/
```

## 受け入れ基準

| 区分 | 基準 |
|---|---|
| `source: deterministic` | 同一入力で **100% 一致**（ハッシュ比較） |
| `source: ai` | JSON Schema 100% 適合 + キーフレーズ含有 + 一致率 80% 以上 (Phase 3) → 95% (Phase 7) |

## 運用

- ゴールデンセットの追加・更新は **必ず ADR を伴う** (`.agents/knowledge/decisions/`)
- 失敗時は実装を疑う前に「期待値が古いのか / プロンプトが変わったのか / モデルが変わったのか」を切り分け
- プロンプトハッシュとモデル ID をテスト入力に必ず含める

## 現状

**空**。Phase 1 着手で最初のゴールデンセット (graph-build / render) を立ち上げる。
