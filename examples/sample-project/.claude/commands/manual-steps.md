---
description: sample-project の手動作業レジストリを横断参照する
argument-hint: [--release <version>] [--status pending|done] [--category pre_release|during_release|post_release]
---

# /manual-steps $ARGUMENTS

## 目的

過去 / 未来のリリースで生成された **手動作業** を一覧表示。
リリース時の TODO 管理 + 過去のパターン学習に活用。

## 実行手順

### ステップ 1: レジストリ読み込み

`ops/registry/manual-steps-registry.md` をパース:
- 各 manual_step の id / title / category / target / relatedChange / status
- Markdown のチェックリスト形式で記述された status (`[ ]` / `[x]`) を解釈

### ステップ 2: フィルタ適用

- `--release <version>`: 該当リリースの manual_step のみ
- `--status pending`: チェック未完了のみ
- `--status done`: チェック完了のみ
- `--category pre_release` (etc.): カテゴリ絞り込み

### ステップ 3: 出力

```markdown
## 手動作業一覧 (n 件)

### Pending (m 件)
- [ ] **<title>** (release: <version>, target: `<entity>`)
  - 手順: ...
  - 確認: ...
  - 担当: <role>

### Done (k 件)
- [x] ...
```

## レジストリ更新は他コマンドが行う

- `/release-prep` が新規 manual_step を append
- 利用者が手動でチェックボックスを更新
- 本コマンドは **読むだけ**

## 過去事例学習 (Phase 7 で詳細化)

横断参照で「同じ target に対する過去の手動作業」を引っ張れるようにする (現状は単純フィルタ、過去事例の自動引用は Phase 7)。

## 禁則

- 手動作業を **勝手に done にしない** (利用者の手動更新のみ)
- 手動作業を **削除しない** (履歴として残す、status=done で表現)
- レジストリの構造を破壊しない (各 entry のフォーマット統一)

## 関連

- /release-prep
- decisions/[Phase 4 計画](../../.agents/knowledge/decisions/2026-05-07-phase-4-plan.md)
