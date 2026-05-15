---
type: decision
date: 2026-05-07
title: HUMAN_MANAGED ブロックのマージアルゴリズム仕様 (Phase 1 必須成果物)
status: active
supersedes:
superseded_by:
tags: [phase-1, render, human-managed, merge, golden-test]
---

# HUMAN_MANAGED ブロックのマージアルゴリズム仕様

## 判断

`yohaku render` が再生成のたびに HUMAN_MANAGED ブロックの内容を **保全する** ためのマージアルゴリズムを以下の通り定める。本仕様はゴールデンテスト (`packages/core/tests/golden/render/`) の正本となる。

## 文脈

- IMPLEMENTATION_GUIDE.md の Phase 1 で「マージアルゴリズム ADR を必須成果物とする」と決めた。本 ADR がそれに該当する。
- 禁則 5 (HUMAN_MANAGED への AI 上書き禁止) を運用上 100% 守るには、決定的なマージロジックとそのテストが不可欠。
- 設計原則 4 (3 種ブロック構造) の「保護される人手領域」を成立させる中核仕様。

## 3 種ブロックのマーカー仕様

```markdown
<!-- DETERMINISTIC_START id="<block-id>" -->
決定的処理層が生成。手編集禁止。再描画で上書き。
<!-- DETERMINISTIC_END id="<block-id>" -->

<!-- AI_MANAGED_START id="<block-id>" -->
AI 層が生成。Phase 8 以降は **customized なら再描画で保全**、テンプレ既定値のままなら上書き。
<!-- AI_MANAGED_END id="<block-id>" -->

<!-- HUMAN_MANAGED_START id="<block-id>" -->
人手補完層。再描画で保護される。
<!-- HUMAN_MANAGED_END id="<block-id>" -->
```

> **Phase 8 (2026-05-08) 更新**: AI_MANAGED は当初「再描画で上書き」だったが、`/yohaku-explain` skill による書き換えを永続化するため、**既存内容がテンプレ既定値と異なれば保全** に仕様変更。`mergeRender` の `isCustomizedAiBlock` で判定する。

- `id` 属性は **エンティティスコープでユニーク**。例: `business-context`, `customer-notes`
- マーカーはコメント形式 (Markdown / HTML として安全)
- ブロック内容のインデントや末尾改行は厳密に保持

## マージアルゴリズム (擬似コード)

```
function mergeRender(templateOutput, existingFile, options):
  # Step 1: 既存ファイルが無ければ新規描画 (ケース 1)
  if not existingFile.exists:
    return write(templateOutput)

  # Step 2: 既存ファイルから HUMAN_MANAGED ブロックを抽出
  existingBlocks = parseBlocks(existingFile.content)
  humanBlocks = filter(existingBlocks, kind=human_managed)

  # Step 3: マーカー破損チェック (ケース 6)
  if hasCorruptedMarkers(existingFile.content):
    raise MarkerCorruptionError

  # Step 4: テンプレート出力にマーカーが揃っているか検証
  templateBlocks = parseBlocks(templateOutput)

  # Step 5: HUMAN_MANAGED ブロックを id で照合してマージ
  mergedContent = templateOutput
  warnings = []

  for templateBlock in filter(templateBlocks, kind=human_managed):
    matchedHuman = findById(humanBlocks, templateBlock.id)
    if matchedHuman:
      mergedContent = replaceBlockContent(mergedContent, templateBlock.id, matchedHuman.content)
    else:
      # ケース 3: 既存ファイルから HUMAN_MANAGED が消失
      warnings.append({code: "human_block_missing", blockId: templateBlock.id})
      # 既存テンプレートの空ブロックをそのまま残す

  # Step 6: テンプレートに無いが既存にある HUMAN_MANAGED ブロック (削除エンティティ等)
  for humanBlock in humanBlocks:
    if not findById(templateBlocks, humanBlock.id):
      warnings.append({code: "human_block_replaced_with_empty", blockId: humanBlock.id})

  return {content: mergedContent, warnings, ...}
```

## エンティティリネーム時の追従 (ケース 4)

`yohaku render --rename <oldName>=<newName>` で明示的に指定された場合のみ実行される。自動検出はしない (誤マージ防止)。

```
function mergeRenameAware(templateOutput, oldFile, newPath, options):
  if not oldFile or not options.rename:
    return mergeRender(templateOutput, existingFileAt(newPath), options)

  oldHumanBlocks = filter(parseBlocks(oldFile.content), kind=human_managed)
  result = mergeRender(templateOutput, existingFileAt(newPath), options)

  for oldBlock in oldHumanBlocks:
    if not blockExistsInResult(result, oldBlock.id):
      # 旧ファイルの HUMAN_MANAGED を新ファイルへ移植
      result = injectHumanBlock(result, oldBlock, originPath=oldFile.path)
      warnings.append({
        code: "human_migrated_from_renamed_entity",
        blockId: oldBlock.id,
        originPath: oldFile.path,
        message: `Migrated HUMAN_MANAGED block "${oldBlock.id}" from ${oldFile.path}`
      })

  return result
```

注入時、ブロック直前に **HUMAN_MIGRATED_FROM** メタコメントを付ける:

```markdown
<!-- HUMAN_MIGRATED_FROM: docs/generated/objects/Account.md (renamed at 2026-05-07) -->
<!-- HUMAN_MANAGED_START id="business-context" -->
...
<!-- HUMAN_MANAGED_END id="business-context" -->
```

## エンティティ削除時 (ケース 5)

`yohaku render` で対象エンティティが知識グラフから消失した場合、対応 Markdown を **削除しない**。
`docs/generated/_archive/<YYYY-MM-DD>/<original-relative-path>` に移動し、HUMAN_MANAGED は archive 側で完全保全する。
利用者が業務的に不要と判断した時点で手動で `_archive/` を整理する。

## マーカー破損時の挙動 (ケース 6)

以下のいずれかを「破損」とみなし、即エラー停止:

- `START` と `END` のペア不整合 (orphan marker)
- `id` 属性の欠落
- `START` の `id` と `END` の `id` の不一致
- 同一ファイル内での `id` 重複
- ネストされたマーカー (HUMAN_MANAGED の中に DETERMINISTIC が入る等)

エラー時は人手介入を要求し、`yohaku render --force` でも自動修復しない。

## ゴールデンテストケース (Phase 1 必須)

`packages/core/tests/golden/render/` に以下 6 ケースを配置する。各ケースは `input/` (旧ファイル + テンプレート出力) と `expected/` (期待結果) のペアを持つ。

### Case 1: 既存ファイルなし

| 入力 | 期待 |
|---|---|
| `existingFile`: 不在 | テンプレート出力をそのまま書き出し、warnings = [] |

### Case 2: HUMAN_MANAGED ブロックのみ存在で内容が DETERMINISTIC / AI_MANAGED と並存

| 入力 | 期待 |
|---|---|
| 既存ファイルに `business-context` HUMAN_MANAGED あり、`overview` DETERMINISTIC あり、`summary` AI_MANAGED あり | DETERMINISTIC / AI_MANAGED は新規描画分で上書き、`business-context` は既存内容を完全保持、warnings = [] |

### Case 3: HUMAN_MANAGED ブロックが消失

| 入力 | 期待 |
|---|---|
| テンプレートには `business-context` HUMAN_MANAGED があるが、既存ファイルには無い | テンプレートの空 HUMAN_MANAGED ブロックがそのまま残る、warnings = [{code: "human_block_missing", blockId: "business-context"}] |

### Case 4: エンティティリネーム

| 入力 | 期待 |
|---|---|
| `--rename Account=NewAccount`、旧 `Account.md` に `business-context` HUMAN_MANAGED あり、新 `NewAccount.md` は不在 | 新ファイルが生成され、`business-context` ブロックの直前に `HUMAN_MIGRATED_FROM:` コメント挿入、warnings = [{code: "human_migrated_from_renamed_entity", blockId: "business-context", originPath: "docs/generated/objects/Account.md"}] |

### Case 5: エンティティ削除

| 入力 | 期待 |
|---|---|
| 既存 `Account.md` あり、知識グラフから Account が消失 (テンプレート不在) | `Account.md` が `docs/generated/_archive/2026-05-07/objects/Account.md` に移動、HUMAN_MANAGED は完全保全、warnings = [] (アーカイブはエラーではない) |

### Case 6: マーカー破損

サブケース 6a〜6e を含む:

- 6a: `HUMAN_MANAGED_START` のみで `END` 無し → エラー
- 6b: `id` 属性欠落 → エラー
- 6c: `START` と `END` の `id` 不一致 → エラー
- 6d: 同一 `id` の重複 → エラー
- 6e: ネスト (HUMAN_MANAGED 内に DETERMINISTIC) → エラー

各サブケースで `MarkerCorruptionError` がスローされ、ファイルは変更されない。

## 代替案

| 案 | 採否 | 理由 |
|---|---|---|
| A. **マーカーで明示的にスコープ管理 + ID 一致 (本案)** | 採用 | 決定的・テスト可能・人間にも明示的 |
| B. ファイル全体の diff を取って人手部分を推定 | 却下 | 推測ベースで決定的でない、再現性が壊れる |
| C. HUMAN_MANAGED を別ファイル (`*.human.md`) に分離 | 却下 | リネーム追従が複雑、Markdown の連続読み体験を損なう |
| D. AI に HUMAN_MANAGED 部分を抽出させる | 却下 | 禁則 3 (AI が決定的処理を肩代わり) 違反 |

## トレードオフ

- **代償**:
  - マーカーが本文に混入する可読性低下 → 利用者は HTML コメントとして無視できる、render 結果のコピーで持ち運ぶ際のみ気になる
  - ID をエンティティスコープでユニーク化する設計コスト → テンプレート側で `id` を自動採番する補助関数を提供して緩和
- **将来課題**:
  - マーカー仕様の v2 (ネスト許容など) は Phase 7 で再検討。互換は ADR の supersede で管理

## 影響範囲

- `packages/core/src/merge/` (Phase 1 で実装)
- `packages/core/src/types/render.ts` (型定義済み)
- `packages/core/tests/golden/render/case-{1..6}/` (Phase 1 で配置)
- `templates/` の eta テンプレートは本仕様のマーカーを正しく出力する責務

## 関連ナレッジ

- [2026-05-07: テンプレートエンジン eta 確定](./2026-05-07-template-engine-eta.md)
- [2026-05-07: source 列必須化](./2026-05-07-source-column-three-layer-boundary.md) — DETERMINISTIC / AI / HUMAN の境界をスキーマレベルで強制する仕組みと併用
