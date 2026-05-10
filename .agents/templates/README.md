# .agents/templates

ナレッジエントリの雛形集。`.agents/knowledge/` にファイルを追加する際は、必ずここのテンプレートをコピーして使う。

| テンプレート | 用途 |
|---|---|
| [`decision.md`](./decision.md) | 設計判断・採用理由 |
| [`pitfall.md`](./pitfall.md) | つまずき・不具合 |
| [`win.md`](./win.md) | 効いた工夫 |
| [`improvement.md`](./improvement.md) | 改善した点・改善案 |
| [`retrospective.md`](./retrospective.md) | サイクル振り返り |

## 使い方

```bash
# 例: 新しい設計判断を記録
cp .agents/templates/decision.md .agents/knowledge/decisions/2026-05-06-eta-template-engine.md
# → 中身を編集し、INDEX.md に 1 行追加
```
