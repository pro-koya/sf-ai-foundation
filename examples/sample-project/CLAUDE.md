# sample-project — Claude Code 憲法

> このファイルは [yohakuforce](https://github.com/yohakuforce/yohakuforce) によって生成されました。
> プロファイル: **full** / Salesforce API: **62.0** / yohaku: **0.0.1**
> 軽量・参照中心を維持してください (上限 15KB 目安)。

---

## 0. このプロジェクトの目的

sample-project は Salesforce 開発プロジェクトです。
**Claude Code の責務は、このプロジェクトの属人化を解消し、運用タスクを構造化された AI 出力で支援すること。**

---

## 1. 必読ドキュメント (この順で読む)

| 順 | パス | 目的 |
|---|---|---|
| 1 | `docs/generated/system-index.md` | プロジェクト全体像 (yohaku render system-index で生成) |
| 2 | `docs/human/business-notes/` (あれば) | 業務文脈 (人手記述、AI 上書き禁止) |
| 3 | `.agents/knowledge/INDEX.md` | 過去の判断・つまずき・成功事例 |
| 4 | `.yohaku/graph.sqlite` | 知識グラフ (yohaku graph query <SQL> でアクセス) |

---

## 2. 設計 3 原則 (踏み外さない)

1. **3 層分離** — 決定的処理 (yohaku CLI) / AI 判断 / 人手補完 を混ぜない
2. **正本は実装側** — 正本は `force-app/` と Git。`docs/generated/` は派生物 (手編集禁止)
3. **AI に生 XML を読ませない** — 必ず `.yohaku/graph.sqlite` 経由で構造化情報を取得

---

## 3. 自律ループ

```
要件整理 → 計画 → 実行 → レビュー → 修正 → 整理 → 課題提起 → (次サイクルへ)
                                            │
                                            └─→ .agents/knowledge/ に蓄積
```

各サイクル末、`.agents/knowledge/retrospectives/` に必ず振り返りを残す。
詳細は [`AGENTS.md`](./AGENTS.md) 参照。

---

## 4. 使えるコマンド

### yohaku CLI (決定的処理)

```bash
yohaku graph build [--incremental]      # force-app/ → 知識グラフ
yohaku graph query "<SQL>"              # グラフへ任意の SOQL/SQL
yohaku graph schema                     # スキーマ定義を出力
yohaku render <target>                  # docs/generated/ に Markdown 出力
yohaku diff --from <ref> --to <ref>     # Git 差分を JSON 化
yohaku metrics --period month           # AI コスト計測
yohaku version
```

### Slash commands (AI エージェント)


- `/onboard [--role <new_joiner|reviewer|release-manager|customer-facing>]`
- `/explain <entity>` / `/impact <entity>`
- `/classify-diff` / `/change-summary`
- `/release-prep --from <tag> --to HEAD` — リリース資材生成
- `/manual-steps [--release <version>]` — 手動作業レジストリ参照


---

## 5. 禁則 (このプロジェクト固有)

- `force-app/` を AI が直接編集しない (コードの編集は別途コーディングエージェントへ)
- `docs/generated/` を手編集しない (`yohaku render` で再生成される派生物)
- `docs/human/` を AI が上書きしない (人手補完領域)
- `.yohaku/graph.sqlite` を直接 INSERT/UPDATE しない (必ず `yohaku` CLI 経由)
- `HUMAN_MANAGED` ブロックを AI が書き換えない
- 顧客名・顧客固有ロジック・顧客データをコミットしない

---

## 6. ナレッジ参照ルール

新しいタスクに着手する前に、必ず以下を確認:

- `.agents/knowledge/decisions/` — 過去の設計判断
- `.agents/knowledge/pitfalls/` — 既知のつまずき (踏み直さない)
- `.agents/knowledge/improvements/` — 改善ポイント
- `.agents/knowledge/wins/` — 効いたパターン (再利用)

タスク完了時、新しい学びは必ず追記。詳細は [`AGENTS.md`](./AGENTS.md)。

---

## 7. 迷ったときの判断軸 (優先度順)

1. その判断は **誰かの余白を増やすか** (本基盤の最終目的)
2. 設計 3 原則を破っていないか
3. 禁則に抵触していないか
4. 過去のナレッジに類似事例があるか
5. 不明点は **推測せず人間に問う**

---

## 8. このファイルの育て方

- **増やすな**: 個別オブジェクトの仕様、業務ルール詳細、長大な手順は書かない
- **減らせ**: 参照で済むものはリンクに置き換える
- **変更履歴は Git で十分**: ファイル内に履歴セクションは作らない
