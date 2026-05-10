---
type: retrospective
date: 2026-05-07
cycle: メタ層と配布物層の物理分離
phase: pre-Phase-1
tags: [architecture, scaffold, governance, directory-structure]
---

# Retrospective: メタ層と配布物層の物理分離

## サイクル要約

ユーザの指摘で「ルート直下の CLAUDE.md / .claude/ / .agents/ は OSS 開発者向けのメタ層であり、利用者プロジェクトに展開される配布物 (CLAUDE.md / .claude/ / .agents/) と用途が違う」という構造的問題に気づき、リポジトリを **メタ層 (ルート直下) / 配布物層 (`scaffold/`) / ソース (`packages/`) / 配布物その他 (`claude-plugin/` `examples/` `docs/`) / 開発時テスト (`tests/golden/`)** に物理分離した。新規 ADR 1 件、新規ディレクトリ 11 件、新規 README 7 件、IMPLEMENTATION_GUIDE.md に新章 1 つと禁則 2 件 (12, 13) 追加。

## 1. 要件整理 — 学び

- ユーザの問いかけ「その認識はあっていますか？」は、私が見落としていた構造的問題を **言語化されないまま提示する形** だった。即座に「はい」と答えるのではなく、なぜ正しいかを 2 層の役割で説明したのが整理になった。
- 「2 つの層が並存する」という事実は v1.0 を作った時点で潜在していたが、当時は気づけなかった。実装に入る前に発見できたのは大きな救い。

## 2. 計画立案 — 学び

- 5 案を出して却下理由を明文化したのは効いた。特に「`meta/` 配下に移動する」案を却下したことで、Claude Code の慣行（CLAUDE.md ルート配置）を尊重できた。
- ディレクトリ名の最終決定 (`scaffold/`) はユーザに委ねた。私の最初の提案 `templates/project/` より一語で意図が伝わる名前を選んでもらえた。
- 詳細 ADR: [メタ層 vs 配布物層 ADR](../decisions/2026-05-07-meta-vs-distribution-layer-separation.md)

## 3. 実行 — 学び

- ディレクトリ作成を 1 コマンドで一括実行 (`mkdir -p`) して `find` で確認する手順が早い
- 各ディレクトリに README を置く方針は導線として有効。新規参画者がどこに何があるか即座に判別できる
- `.gitkeep` を空のサブディレクトリに置いて Git 管理対象にしたが、内容が増えれば自然に削除される

## 4. レビュー — 学び

- 禁則 12 (混在禁止) と禁則 13 (配布物層を入力にしない) を分けて書いたのは効いた。前者は人間向け、後者は AI 向けの注意で、性質が違う
- 目次の章番号更新 (18 / 19 / 20 へのシフト) を忘れずに反映できた

## 5. 修正・再実装 — 学び

- 大きな手戻りは無し。ユーザ承認 → 実行という順序が機能した
- 命名規則 (`.eta` を付けるかどうか) をどこに書くか迷ったが、ADR と方針書と scaffold/README.md の 3 か所に分散させた。Phase 6 で具体ガイドラインに昇格する想定

## 6. 整理 — 学び

- README / IMPLEMENTATION_GUIDE / .agents/knowledge/INDEX 全てを同サイクルで整合させた
- AGENTS.md 自体は変更不要だった (層分離は IMPLEMENTATION_GUIDE.md の領分で AGENTS.md は普遍的なループ規定)

## 7. 課題提起 — 次サイクルへの種

- [ ] **scaffold/CLAUDE.md.eta の最初のドラフト**: 利用者プロジェクト向けに「OSS 開発者向け CLAUDE.md (メタ層) を翻訳して書き起こす」作業。Phase 2 で本格化する想定だが、骨格だけは Phase 1 着手前に用意しても良い
- [ ] **eta テンプレートの変数命名規則**: `<%= projectName %>` `<%= profile %>` `<%= primaryLanguage %>` 等の標準変数セットを ADR 化
- [ ] **scaffold と本リポジトリの README/AGENTS の差分管理**: 何が「メタ→利用者」翻訳で変わるか、何は同じかを明文化
- [ ] **Phase 1 着手前準備**: LICENSE (Apache 2.0) 配置、SECURITY.md / CONTRIBUTING.md 骨格、package.json 雛形 (前サイクルの繰越)

## 良かった点 (Keep)

- **ユーザの「認識合わせ」のオープン質問にきちんと整理して答えた**: 早合点せず、なぜ正しいか・何が見落とされていたかを言語化
- **5 案を比較してから採用した**: ファイル命名で区別する案を却下した記録は将来の参考になる
- **物理分離 + 判別ルール + 禁則 で 3 重に守る設計**: ディレクトリだけでなく言語化されたルールと禁則の両方で混入を防止
- **既存資産を壊さない選択**: ルート直下のファイルを動かさず、新規ディレクトリの追加だけで完結

## 課題 (Problem)

- `scaffold/.claude/` `scaffold/.agents/` は構造を作ったが **中身は空** で、Phase 2 まで実体が生まれない。途中の Phase で Claude Code が `scaffold/` を見て混乱しないよう、各 README の冒頭に「禁則 13 により本リポジトリでは scaffold/ は資料扱い」と明記済みだが、実装中にもう一度自分で踏まないか要観察
- `.eta` 拡張子を付けるかどうかの判断基準が「変数展開があるか」だが、運用していくうちに揺れる可能性。Phase 6 で再点検する

## 試したいこと (Try)

- Phase 2 で最初の `scaffold/CLAUDE.md.eta` を書き起こすときに、メタ層 `CLAUDE.md` との差分（何が同じで何が違うか）を ADR に残し、以降の利用者向け文書執筆の指針にする
- `scaffold/` のリンティング（ルート向け文章が混入していないかを検出する）を Phase 6 までに自動化する案

## 蓄積された関連ナレッジ

- decisions:
  - [2026-05-06 プロジェクト基盤の初期構築](../decisions/2026-05-06-bootstrap-project-foundation.md)
  - [2026-05-07 IMPLEMENTATION_GUIDE.md v1.1 改訂](../decisions/2026-05-07-implementation-guide-revision-v1.1.md)
  - [2026-05-07 メタ層 vs 配布物層 物理分離](../decisions/2026-05-07-meta-vs-distribution-layer-separation.md) ← **本サイクルの中心 ADR**
- pitfalls: (今サイクルでは無し)
- wins: (今サイクルでは無し)
- improvements: (今サイクルでは無し)
