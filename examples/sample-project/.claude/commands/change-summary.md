---
description: 直近の差分から PR レビュー用の change-summary Markdown を生成・配置する
argument-hint: [--from <ref>] [--to <ref>] [--output docs/ai-augmented/change-summaries/]
---

# /change-summary $ARGUMENTS

## 目的

`/classify-diff` が出力した change_summary JSON を、**PR に貼れる Markdown サマリ**へ変換し、`docs/ai-augmented/change-summaries/<date>-<short-id>.md` に配置する。

## 実行手順

### 1. 既存の change_summary JSON を取得

`/classify-diff` を先に実行している前提:
- 既存ファイル `docs/ai-augmented/change-summaries/*.json` の最新を採用、または
- このコマンドから `/classify-diff` を呼び直す (`$ARGUMENTS` にフラグを渡す)

### 2. Markdown 化

以下の構造で出力:

```markdown
## 差分サマリ: <fromRef>..<toRef>

> 自動生成 (yohaku change-summary): <createdAt>

**集計**
- 変更ファイル: N 件 (+X / -Y)
- カテゴリ別: data_model=A, automation=B, permission=C, ui=D, logic=E, operational=F

<!-- DETERMINISTIC_START id="categories" -->
### data_model (n 件)
- `Account.Industry` (modified, small)
  - レビュー観点: ... _(AI)_
  - 業務影響: ... _(AI)_
- ...

### automation (n 件)
- ...
<!-- DETERMINISTIC_END id="categories" -->

<!-- AI_MANAGED_START id="overall-summary" -->
**全体所感**: ... (AI 推測、再生成で上書き)
<!-- AI_MANAGED_END id="overall-summary" -->

<!-- HUMAN_MANAGED_START id="reviewer-notes" -->
<!-- レビュー担当者の補足はここに -->
<!-- HUMAN_MANAGED_END id="reviewer-notes" -->

### 手動作業チェックリスト
- [ ] `Account.Industry`: ピックリスト値追加 → 既存レコード補正
- [ ] ...
```

### 3. 大型差分のサンプリング

`raw_diff.truncated === true` または `categories[*].changes.length > 50` の場合:
- 各カテゴリで **最大 10 件まで詳細表示**、残りは「他 N 件」と集約
- AI 出力ハルシネーション抑制のため、**サンプル件数を明示**

### 4. ファイル配置とマージ

- 出力先: `docs/ai-augmented/change-summaries/<YYYY-MM-DD>-<short-id>.md`
- 既存ファイルがあれば **HUMAN_MANAGED ブロックを保護** (yohaku render の merge と同等の挙動)
- 同時に `<...>.json` も配置 (機械可読バックアップ)

### 5. メトリクス記録

```bash
yohaku metrics record --model claude-sonnet-4-6 --command /change-summary --in <est> --out <est>
```

## 禁則

- **業務文脈の捏造禁止**: HUMAN_MANAGED 領域は空のまま。レビュー担当者が記入する
- **サンプリング時の bias 抑制**: 各カテゴリから先頭 N 件ではなく、`changeKind` 別 (added / modified / removed) で均等にサンプル
- **PR テンプレートとの統合**: 利用者の `.github/PULL_REQUEST_TEMPLATE.md` から change-summary を参照する仕組みは Phase 6 で
