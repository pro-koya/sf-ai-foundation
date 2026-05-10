# SF-AI-Foundation — Claude Code 憲法

> 本ファイルは「軽量・参照中心」を貫く (上限 15KB 目安)。詳細は参照先で読む。

---

## 0. このプロジェクトの目的 (一文)

**Salesforce に携わる人々の時間と余白を生み出すため、属人化と運用負荷を AI で構造的に解消する OSS 基盤を作る。**

---

## 1. 必読ドキュメント (この順で読む)

| 順 | ファイル | 目的 |
|---|---|---|
| 1 | [`README.md`](./README.md) | 存在理由・コンセプト・ゴール |
| 2 | [`AGENTS.md`](./AGENTS.md) | AI 自律ループの行動指針とナレッジ運用 |
| 3 | [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) | 実装方針の正本 (Phase 1〜7) |
| 4 | [`.agents/knowledge/INDEX.md`](./.agents/knowledge/INDEX.md) | 蓄積されたナレッジの入口 |

---

## 2. 設計 3 原則 (絶対に踏み外さない)

1. **3 層分離** — 決定的処理 (CLI) / AI 判断 / 人手補完 を混ぜない。
2. **正本は実装側** — 正本は `force-app/` と Git。Markdown は派生物。
3. **AI に生データを読ませない** — XML を直接読まず、必ず知識グラフ (`.sfai/graph.sqlite`) を経由する。

詳細は [`IMPLEMENTATION_GUIDE.md` § 貫く設計原則](./IMPLEMENTATION_GUIDE.md#貫く設計原則) 参照。

---

## 3. 自律ループ (AI が回す PDCA)

```
要件整理 → 実行 → レビュー → 修正 → 再実装 → 整理 → 課題提起 → (要件整理へ戻る)
                                                   │
                                                   └─→ ナレッジ蓄積 (.agents/knowledge/)
```

各ステップの責務・チェックリスト・ナレッジ書き込みポイントは [`AGENTS.md`](./AGENTS.md) に在る。
**ループの各サイクル終了時に、必ず `.agents/knowledge/` に何かを書き残す。** 書くものが無い場合は「学びが無かった」を明示的に記録する。

---

## 4. 禁則 (10 か条)

[`IMPLEMENTATION_GUIDE.md` § 横断的に守るべき禁則事項](./IMPLEMENTATION_GUIDE.md#横断的に守るべき禁則事項) の 10 か条を遵守。要点のみ:

- 正本の Markdown 化禁止 / 知識グラフ直接書き換え禁止 / AI による決定的処理代替禁止
- CLAUDE.md 肥大化禁止 (15KB 上限) / HUMAN_MANAGED への AI 上書き禁止
- subagent 乱用禁止 / hooks での重い処理禁止 / 顧客固有情報の混入禁止
- 無警告破壊変更禁止 / 目的外スコープクリープ禁止

---

## 5. ナレッジ参照ルール

新しいタスクに着手する前に、以下を **必ず** 確認する。

- [`.agents/knowledge/decisions/`](./.agents/knowledge/decisions/) — 過去の設計判断と理由
- [`.agents/knowledge/pitfalls/`](./.agents/knowledge/pitfalls/) — 既知のつまずき (踏み直さない)
- [`.agents/knowledge/improvements/`](./.agents/knowledge/improvements/) — 既知の改善ポイント
- [`.agents/knowledge/wins/`](./.agents/knowledge/wins/) — 効いたパターン (再利用)

タスク完了時、**新しい学びは必ず追記する**。既存ナレッジと衝突する場合は古い方を更新し、変更理由を `decisions/` に書く。

---

## 6. 道具立て (実装が始まったら埋める)

| 種類 | パス | 状態 |
|---|---|---|
| CLI | `bin/sfai` | Phase 1 で作る |
| 知識グラフ | `.sfai/graph.sqlite` | Phase 1 で作る (gitignore) |
| Subagents | `.claude/agents/` | Phase 2 以降で追加 |
| Slash commands | `.claude/commands/` | Phase 2 以降で追加 |
| Hooks | `.claude/settings.json` | Phase 2 以降で追加 |

詳細は各 Phase の章を参照。

---

## 7. 迷ったときの判断軸 (優先度順)

1. その判断は **誰かの余白を増やすか** (この OSS の最終目的)
2. 設計 3 原則を破っていないか
3. 現在 Phase のゴールに必要か (スコープクリープ警戒)
4. 禁則 10 か条に抵触していないか
5. 過去のナレッジ (`.agents/knowledge/`) に類似事例があるか

判断に迷ったら、迷った事実そのものを `.agents/knowledge/decisions/` に残し、人間に問い合わせる。

---

## 8. このファイルの育て方

- **増やすな**: 個別オブジェクトの仕様、業務ルール、長大な手順は書かない (それは派生ドキュメントに書く)。
- **減らせ**: 参照で済むものはリンクに置き換える。
- **更新ログは Git で十分**: ファイル内に変更履歴セクションは作らない。
