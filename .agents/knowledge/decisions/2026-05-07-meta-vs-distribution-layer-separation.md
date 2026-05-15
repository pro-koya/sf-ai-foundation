---
type: decision
date: 2026-05-07
title: メタ層と配布物層をディレクトリで物理分離する
status: active
supersedes:
superseded_by:
tags: [architecture, governance, directory-structure, scaffold]
---

# メタ層と配布物層の物理分離

## 判断

リポジトリに以下の **2 つの層を物理的に分離** する。両層は似た見た目のファイル (CLAUDE.md / .claude/ / .agents/) を持つが、用途が完全に異なるため、ディレクトリで明確に隔離する。

| 層 | 配置 | 用途 | 読む人 |
|---|---|---|---|
| **メタ層** | リポジトリルート直下 | 本 OSS を **開発する側** が使う指示書・設定・ナレッジ | OSS 開発者 / 開発時の AI |
| **配布物層** | `scaffold/` `claude-plugin/` `examples/` `docs/` 配下 | OSS を **導入した利用者** に届く成果物 | OSS 利用者 / 利用者プロジェクトの AI |

ディレクトリ名 `scaffold/` で確定する（`yohaku init` が利用者プロジェクトに展開する内容のひな型を置く場所）。

## 文脈

- v1.0 と v1.1 の作業で、本リポジトリ直下に `CLAUDE.md` `AGENTS.md` `.claude/` `.agents/` を配置した。
- 一方、本 OSS のゴールは「Salesforce プロジェクトに導入したときに使う `CLAUDE.md` 等を提供すること」でもある。
- このまま実装に入ると、**「開発者向けの指示書」と「利用者向けの雛型」が同じディレクトリ階層で混在し、AI も人間もどちらを編集すべきか判断できなくなる** 重大なリスクがある。
- ユーザがこの構造的リスクに気づき、明示的に分離を要求した（2026-05-07）。

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **`scaffold/` で物理分離 (今回採用)** | 採用 | 判別ルールが単純（ルート直下=メタ、`scaffold/`=配布物）、既存メタ層の改修が最小、`yohaku init` の実装も自然 |
| B. ファイル命名で区別 (`CLAUDE.user.md.eta` 等) | 却下 | 人間の目視確認は可能だが、ディレクトリレベルの隔離が無く混入事故が起きうる |
| C. メタ層を `meta/` 配下に移動、ルートを配布物用に解放 | 却下 | 既存 ADR / リンクが大量に壊れる、ルートの自然さ (Claude Code が CLAUDE.md を見にくる慣行) を捨てる |
| D. 別リポジトリに分離 | 却下 | リリースバージョンの整合が取りづらい、開発フローが煩雑化 |
| E. monorepo で `packages/yohaku-meta/` `packages/yohaku-scaffold/` に分離 | 却下 | `package` の概念とずれる（メタ層は package ではなく開発リポジトリそのもの） |

## ディレクトリ構造（確定版）

```
yohakuforce/                    ← リポジトリルート
│
├── README.md                        ← プロジェクト全体
├── CLAUDE.md                        ← [メタ] OSS 開発時の AI 憲法
├── AGENTS.md                        ← [メタ] OSS 開発時の自律ループ
├── IMPLEMENTATION_GUIDE.md          ← [メタ] 実装方針書 v1.1+
├── LICENSE                          ← Apache 2.0 (Phase 1 着手前に追加予定)
├── .claude/                         ← [メタ] 開発時の Claude Code 設定
├── .agents/                         ← [メタ] 開発時のナレッジ蓄積 (decisions / pitfalls / wins / improvements / retrospectives)
├── .gitignore
│
├── packages/                        ← [ソース] OSS 本体 (将来の monorepo)
│   └── core/                   ← Phase 1 で実装 (CLI + 知識グラフ)
│
├── scaffold/                        ← [配布物] yohaku init で利用者プロジェクトに展開
│   ├── README.md                    ←   このディレクトリの位置付け
│   ├── CLAUDE.md.eta                ←   利用者プロジェクトの CLAUDE.md ひな型
│   ├── AGENTS.md.eta                ←   利用者プロジェクトの AGENTS.md ひな型
│   ├── .claude/                     ←   利用者の Claude Code 設定 (commands / agents / settings.json)
│   ├── .agents/                     ←   利用者のナレッジ基盤 (knowledge/INDEX.md / templates/)
│   └── .gitignore
│
├── claude-plugin/                   ← [配布物] Claude Code Plugin 形式 (Phase 6 で本実装)
│   └── README.md
│
├── examples/                        ← [配布物] サンプル / 動作確認用
│   └── README.md                    ←   sample-project は Phase 6 で追加
│
├── docs/                            ← [配布物] 利用者向けドキュメント
│   ├── README.md
│   ├── 01-getting-started/          ←   Phase 6 で執筆
│   ├── 02-concepts/
│   └── 03-reference/
│
└── tests/                           ← [開発時テスト]
    └── golden/                      ←   ゴールデンテスト基盤 (Phase 1 で立ち上げ)
        └── README.md
```

### 判別ルール（混乱を防ぐため）

ファイルを編集する前に、必ず以下のいずれかを確認する。

1. **リポジトリルート直下** または `.claude/` / `.agents/` 配下 → **メタ層**（OSS 開発側の挙動を変える）
2. **`scaffold/` 配下** → **配布物のひな型**（OSS 利用者に届く内容を変える）
3. **`packages/` 配下** → OSS のソースコード（実装）
4. **`docs/` 配下** → 利用者向け公開ドキュメント
5. **`examples/` `claude-plugin/` `tests/` 配下** → 用途が明確な専用領域

「この修正は OSS 開発者が見るのか、OSS 利用者が見るのか」で迷ったら、常にこのルールに戻る。

### 命名規則

- `scaffold/` 配下のテンプレートファイルは **`.eta` 拡張子** を付ける（eta テンプレートエンジンで処理されることを明示）
- `scaffold/.claude/` `scaffold/.agents/` 配下の **静的な設定ファイル** は拡張子 `.eta` を付けず、そのままコピーされる
- ひな型に変数展開が無い場合でも、**将来の差し替え可能性を残すため `.eta` 化を検討** する判断ルールは `IMPLEMENTATION_GUIDE.md` の Phase 6 で詰める

## 禁則の派生

本 ADR を反映して、以下を `IMPLEMENTATION_GUIDE.md` に追加する。

- **禁則 12 (案)**: メタ層と配布物層の混在禁止 — リポジトリルート直下のファイルを `scaffold/` にコピーする際は必ず内容を見直す（メタ層は OSS 開発者向け、配布物層は利用者向けで対象が違う）
- **禁則 13 (案)**: 配布物層の直接利用禁止 — メタ層 (本リポジトリの開発活動) は `scaffold/` 配下を「実物として」読み込まない。利用者プロジェクトに展開された後に初めて意味を持つ

## トレードオフ

- **代償**:
  - ディレクトリ階層が増え、新規参画者の見通しがやや悪くなる → 各ディレクトリ直下に `README.md` を配置して導線を明示
  - 同名ファイル (`CLAUDE.md` と `scaffold/CLAUDE.md.eta`) が並存し、grep 結果に混在する → grep 時にディレクトリスコープを意識する習慣付け
- **将来課題**:
  - `scaffold/` を実装する際、メタ層からの単純コピーで済まない（コンセプト保持しつつ利用者向けに書き換える必要）→ Phase 2 / Phase 5 / Phase 6 の各タイミングで段階的に育てる

## 影響範囲

- リポジトリ構造（新規ディレクトリ作成）
- `IMPLEMENTATION_GUIDE.md` への新章追加（メタ層 vs 配布物層）
- `README.md` のドキュメント構成表の更新
- 禁則 12, 13 の追加検討

## 関連ナレッジ

- [2026-05-06: プロジェクト基盤の初期構築](./2026-05-06-bootstrap-project-foundation.md)
- [2026-05-07: IMPLEMENTATION_GUIDE.md v1.1 改訂方針](./2026-05-07-implementation-guide-revision-v1.1.md)
- 派生予定: Phase 6 で `scaffold/` の中身を本格構築する際の各種 ADR
