# AGENTS.md — AI 自律ループの行動指針

> 本書は、SF-AI-Foundation プロジェクトに参加するすべての AI エージェントの **行動憲章**である。
> Claude Code、Antigravity、Codex、その他の AI が共通で参照する。

---

## 0. 大前提

**このプロジェクトの最終目的は「Salesforce に携わる人々の余白と豊かさを生み出すこと」だ。**

技術的判断のすべては、その判断が「誰かの余白を増やすか」というフィルタを通る。
コードの美しさや技術的興味は、二の次にする。

---

## 1. AI が回す自律ループ

```
                ┌──────────────────────────────────────────────┐
                │                                              │
                ▼                                              │
          ┌───────────┐                                        │
          │ 1. 要件整理│                                        │
          └─────┬─────┘                                        │
                │                                              │
                ▼                                              │
          ┌───────────┐                                        │
          │ 2. 計画立案│ ───────► .agents/knowledge/decisions/  │
          └─────┬─────┘                                        │
                │                                              │
                ▼                                              │
          ┌───────────┐                                        │
          │ 3. 実行    │                                        │
          └─────┬─────┘                                        │
                │                                              │
                ▼                                              │
          ┌───────────┐                                        │
          │ 4. レビュー│ ───────► .agents/knowledge/pitfalls/   │
          └─────┬─────┘          .agents/knowledge/wins/       │
                │                                              │
                ▼                                              │
          ┌───────────┐                                        │
          │ 5. 修正    │                                        │
          └─────┬─────┘                                        │
                │                                              │
                ▼                                              │
          ┌───────────┐                                        │
          │ 6. 再実装  │                                        │
          └─────┬─────┘                                        │
                │                                              │
                ▼                                              │
          ┌───────────┐                                        │
          │ 7. 整理    │ ───────► .agents/knowledge/improvements/
          └─────┬─────┘                                        │
                │                                              │
                ▼                                              │
          ┌───────────┐                                        │
          │ 8. 課題提起│ ───────► .agents/knowledge/retrospectives/
          └─────┬─────┘                                        │
                │                                              │
                └──────────────────────────────────────────────┘
                       (新しい要件として次サイクルへ)
```

### 各ステップの責務

#### 1. 要件整理

- **入力**: 人間からの依頼、または前サイクルで提起された課題
- **やること**:
  - 依頼の **本質的な目的** を一文で要約する (「何を作るか」ではなく「誰の何を解決するか」)
  - 制約・前提・成功条件を箇条書きにする
  - 既存の `.agents/knowledge/` を必ず参照し、類似事例の有無を確認する
  - 不明点は **推測せず人間に問い合わせる** (推測した場合はそれを明示)
- **完了条件**: 一文の目的、成功条件、参照ナレッジが文書化されている

#### 2. 計画立案

- **入力**: 整理された要件
- **やること**:
  - 実装フェーズを Phase 1〜7 のどこに位置付けるかを判定
  - 設計 3 原則 (3 層分離 / 正本は実装側 / AI に生データを読ませない) と照合
  - 禁則 10 か条と照合
  - **代替案を最低 2 つ** 出し、トレードオフを記述
  - 採用案と却下理由を `.agents/knowledge/decisions/` に新規ファイルで記録
- **完了条件**: 採用案・代替案・却下理由が `decisions/` に永続化されている

#### 3. 実行

- **入力**: 採用された計画
- **やること**:
  - **小さなコミット単位** で前進する (1 コミット = 1 検証可能な変更)
  - TDD を可能な限り守る (RED → GREEN → REFACTOR)
  - hooks や CLI の決定的処理を活用し、AI に決定的処理を肩代わりさせない
  - 大規模変更は **subagent に並列で投げる** (コンテキスト隔離が必要なときだけ)
- **完了条件**: テストが通る、または通らない理由が明文化されている

#### 4. レビュー (自己レビュー)

- **入力**: 実行成果
- **やること**:
  - **CRITICAL チェック**: セキュリティ / データ消失 / 禁則違反
  - **HIGH チェック**: 設計 3 原則違反 / Phase ゴール逸脱
  - **MEDIUM チェック**: コード臭 / 重複 / マジックナンバー
  - つまずいた点があれば `.agents/knowledge/pitfalls/` に新規ファイル
  - 効いた工夫があれば `.agents/knowledge/wins/` に新規ファイル
  - 必要に応じて `code-reviewer` / `security-reviewer` などの専門 subagent を起動
- **完了条件**: CRITICAL がゼロ、HIGH に対する対処方針が決まっている

#### 5. 修正

- **入力**: レビュー指摘
- **やること**:
  - CRITICAL は **即修正**
  - HIGH は原則修正、合理的理由がある場合のみ次サイクルに繰り越し (理由を `decisions/` に記録)
  - MEDIUM は時間が許す範囲で
- **完了条件**: CRITICAL ゼロ、HIGH の処遇が明確

#### 6. 再実装

- **入力**: 修正方針
- **やること**:
  - 局所修正で済むなら局所修正
  - 設計判断が誤っていたなら **戻って 2. 計画立案 から** やり直す勇気を持つ
  - 戻った場合は `decisions/` の旧判断を更新し、変更理由を併記
- **完了条件**: 修正後にテスト・レビューを再実施

#### 7. 整理

- **入力**: 完成した変更
- **やること**:
  - **不要コード・不要コメント・不要ファイルの削除**
  - 命名・ファイル分割の見直し (200〜400 行典型、800 行上限)
  - ドキュメント (README / IMPLEMENTATION_GUIDE / generated docs) の同期
  - 改善できた点を `.agents/knowledge/improvements/` に記録
- **完了条件**: コード・ドキュメント・ナレッジが整合している

#### 8. 課題提起

- **入力**: 完成サイクル全体
- **やること**:
  - サイクル全体を振り返り `.agents/knowledge/retrospectives/YYYY-MM-DD-<slug>.md` を書く
  - 「次やるべきこと」「やり残したこと」「気づいた構造的な課題」を提起
  - 提起された課題は次サイクルの **要件整理** の入力になる
- **完了条件**: 振り返りファイルが残り、次サイクルの種が出ている

---

## 2. ナレッジ蓄積ルール (永続自己改善)

### 2.1 4 種類のナレッジ

| 種類 | パス | 何を書くか |
|---|---|---|
| **decisions** | `.agents/knowledge/decisions/` | 設計判断・採用案・却下理由・トレードオフ |
| **pitfalls** | `.agents/knowledge/pitfalls/` | つまずき・不具合・誤解しやすいポイント・回避策 |
| **wins** | `.agents/knowledge/wins/` | 効いた工夫・うまくいったパターン・再利用したい知見 |
| **improvements** | `.agents/knowledge/improvements/` | 「次はこうしたい」「ここを改善した」 |
| **retrospectives** | `.agents/knowledge/retrospectives/` | サイクル単位の振り返り (時系列) |

### 2.2 ファイル命名

- decisions / improvements / wins / pitfalls: `YYYY-MM-DD-<short-slug>.md` (例: `2026-05-06-prefer-eta-over-handlebars.md`)
- retrospectives: `YYYY-MM-DD-<cycle-slug>.md`

### 2.3 ファイルテンプレート

各種類のテンプレートは [`.agents/templates/`](./.agents/templates/) に在る。**必ずテンプレートに従う** (検索性・一貫性のため)。

### 2.4 INDEX

`.agents/knowledge/INDEX.md` は **AI が直接更新する**。新規ファイル追加時、INDEX に 1 行 (タイトル + 1 行サマリ) を追記する。

### 2.5 衝突時の扱い

新しい知見が既存ナレッジと矛盾した場合:

1. 古いファイルを **削除しない**。`Status: Superseded by <new-file>` を冒頭に追記する。
2. 新しいファイルの冒頭に `Supersedes: <old-file>` を書く。
3. 変更理由を `decisions/` に記録する。

---

## 3. Phase スコープ規律

> Phase は「価値の届け先 (リリース)」と紐付けて初めて意味を持つ。サイクル単位の発見でやみくもに新 Phase を生やすと、計画が空中分解する。
> 本章は 2026-05-10 の構造的反省 ([scope-discipline-and-phase-restructure ADR](./.agents/knowledge/decisions/2026-05-10-scope-discipline-and-phase-restructure.md)) の結論として恒久ルール化された。

### 3.1 Phase 着手時のスコープロック

Phase 着手時、その Phase の ADR (`.agents/knowledge/decisions/YYYY-MM-DD-<phase-id>-plan.md`) に以下を **必ず明記し、以後追加しない**:

- **北極星目標**: その Phase が誰のどの余白を増やすか (1 文)
- **ゴール条件 (DoD)**: 達成できれば Phase 完了と判断できる箇条書き
- **Out of Scope**: やらないことを明示 (推測の余地を残さない)
- **対応リリース**: v0.x.0 のどれに含まれるか

### 3.2 進行中の発見は原則 Phase 内で対処

サイクル進行中に見つかった課題 (バグ・改善余地・追加要望) は、**原則そのPhase内で責任を持って解決する**。Phase が長くなることを許容する。

新 Phase に逃がしたくなる衝動が来たら、まず以下を自問する:

1. これは元の北極星目標の達成に必要か?
2. 必要なら現 Phase で対処すべき (Phase 内対処)
3. 不要なら `pitfalls/` または `improvements/` に記録するだけで終える (繰越しない)

### 3.3 新 Phase 追加の閾値

以下の (a) (b) を **両方** 満たす場合のみ、新 Phase の起案を許可する:

- (a) 現 Phase の北極星目標から **明確に外れている** (= 同じ Phase に入れると目標が二重化する)
- (b) **人間オーナーの明示承認** がある

新 Phase 着手 ADR には以下を **必ず** 記述する:

- なぜ前 Phase の中ではなく独立 Phase である必要があるか
- 前 Phase からの引き継ぎ事項と、引き継ぎではない理由

### 3.4 検証だけで Phase を立てない

「検証だけ」「実機確認だけ」「動作確認だけ」で Phase を 1 つ立てない。検証ゲートは **元の Phase の完了条件** に含める。

これを破ると Phase が無限増殖する (2026-05-10 改訂の起点となった失敗パターン: Phase 15 = コード変更ゼロの検証専用 Phase)。

### 3.5 リリースとの紐付け

Phase は単独では存在せず、必ず **どの v0.x.0 リリースに寄与するか** を着手 ADR に書く。リリース粒度のテーマ (例: ドキュメント完全化、内部検証実証) を超えて Phase が膨らみそうになったら、それは **新リリース (v0.(x+1).0) のサイン** である。

### 3.6 過去の失敗事例 (再発防止のための記憶)

2026-05-08 〜 05-09 の 2 日間に Phase 7 (元: 普及) → 8 → 9 → 9.x → 10 → 11 → 12 → 13 → 14 → 15 と **9 個の Phase が連鎖追加** された。実態はすべて「ドキュメント完全化」という 1 つのテーマだった。Phase 15 に至っては「コード変更ゼロ・検証のみ」だった。

これは本章 §3.1〜§3.4 のいずれも守られなかった結果である。詳細は [decisions/2026-05-10-scope-discipline-and-phase-restructure.md](./.agents/knowledge/decisions/2026-05-10-scope-discipline-and-phase-restructure.md) を参照。

---

## 4. 並列・委譲のルール

### subagent を使うとき

- 大量ファイル走査、深い依存解析、長時間処理、領域専門レビュー
- 複数の独立タスクを並列実行できるとき (必ず 1 メッセージで複数起動)

### subagent を使わないとき

- 軽い会話的タスク
- 主エージェントがコンテキストを持ち続けるべきタスク
- 結果を主エージェントが受け取って続けて使うことが少ない一回限りの確認

### 委譲時の注意

- 各 subagent には **「自己完結したブリーフィング」** を渡す (主の会話履歴は見えない前提)
- subagent の出力は **検証してから採用** する。サマリは意図を語るが、実装は意図と異なることがある。

---

## 5. 人間との接し方

- **推測せず聞く**: 業務文脈・優先度・顧客固有ルールは推測しない
- **判断材料を渡してから問う**: 「A と B どちらにしますか?」ではなく「A と B のトレードオフは X / Y。私の推奨は A、理由は Z。よろしいですか?」
- **重要判断は記録を残す**: 人間の決定は `.agents/knowledge/decisions/` に必ず書き残す
- **温度感を共有する**: 不確実な箇所は不確実だと明示する。確信があるところは断言する。

---

## 6. 禁止事項 (禁則 14 か条と同期)

[`IMPLEMENTATION_GUIDE.md` § 横断的に守るべき禁則事項](./IMPLEMENTATION_GUIDE.md#横断的に守るべき禁則事項) を参照。
特に AI が踏みやすいワナ:

- **AI が決定的処理を肩代わりする** (XML パース・差分計算・スキーマ検証)
- **HUMAN_MANAGED ブロックを書き換える**
- **CLAUDE.md / AGENTS.md を肥大化させる**
- **subagent を「便利だから」という理由で乱用する**
- **「動いたから OK」で整理ステップを飛ばす**

---

## 7. このサイクルを 1 ファイルで開始する

1. 人間からの依頼を受ける
2. このファイルの **§1 各ステップ** を順に実行
3. 各ステップ完了時に該当ナレッジへ書き込み
4. サイクル末に `retrospectives/` に振り返り
5. 次サイクルへ

サイクル粒度は「コミット単位」より大きく、「機能単位」より小さい。**1〜数日で 1 サイクル** が目安。

---

## 8. このファイルの育て方

- ループの構造を変えるときは、変更理由を `decisions/` に書いてから本書を更新する
- 個別事例は本書に書かず `.agents/knowledge/` に書く
- 30KB を超えたら分割を検討する

---

**最終的に問うべきこと: そのサイクルは、誰かの余白を 1 mm でも増やしたか?**


<claude-mem-context>
# Memory Context

# claude-mem status

This project has no memory yet. The current session will seed it; subsequent sessions will receive auto-injected context for relevant past work.

Memory injection starts on your second session in a project.

`/learn-codebase` is available if the user wants to front-load the entire repo into memory in a single pass (~5 minutes on a typical repo, optional). Otherwise memory builds passively as work happens.

Live activity: http://localhost:37777
How it works: `/how-it-works`

This message disappears once the first observation lands.
</claude-mem-context>