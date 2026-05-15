---
type: win
date: 2026-05-15
title: OSS 公開前の顧客固有情報スキャンパターンが機能した
tags: [v0.3.0, oss-release, security, gitignore, customer-data]
---

# OSS 公開前の顧客固有情報スキャンパターンが機能した

## 何が効いたか

v0.3.0 公開準備作業で、未コミットファイル群の中に内部プロジェクト名 (固有名詞) が
複数ファイルに混入していることを事前スキャンで発見できた。
`grep -rn "<固有名詞>" . --include="*.md" ...` パターンで全ファイルを一括スキャンし、
コミット前に全件を修正または `.gitignore` での除外で対処できた。

## 発見された問題と対処

1. `.agents/knowledge/wins/*.md` — 1 行の記述に固有名詞 → 「実プロジェクト」に置き換え
2. `.agents/knowledge/decisions/*.md` — 2 箇所 → 「現参画プロジェクト」「現参画または他社内案件」に置き換え
3. `.agents/review-result/baseline.md` — ベースライン計測ログ (内部プロジェクト詳細) → `.gitignore` で除外
4. `.agents/v0.3.0/intro/`, `playbooks/`, `hearing-script.md` — 内部運用記録 → `.gitignore` で除外

## 教訓

- `wins/` や `decisions/` のような「ナレッジ蓄積ファイル」は、実利用セッション直後に書かれるため
  プロジェクト固有名詞が自然に混入しやすい。OSS 公開前には必ずスキャンする。
- 内部運用記録 (ベースライン計測 / playbook / 内部向け資料) は最初から `.gitignore` に
  パターンを登録しておく方が安全。後付けで gitignore 追加した場合は `git ls-files` で
  既に追跡されているファイルを確認する。

## 再利用方法

OSS リリース前チェックリストに以下を追加:
```bash
# 顧客固有名詞スキャン (事前に名詞リストを定義)
grep -rn "<顧客名A>\|<顧客名B>\|<プロジェクト名>" . \
  --include="*.ts" --include="*.md" --include="*.json" \
  | grep -v node_modules | grep -v ".git"
```
