---
type: decision
date: 2026-05-08
title: Phase 7-A 完了 — 既存知識グラフ全種を Markdown 化
status: active
tags: [phase-7, phase-7-a, completion, render, documentation]
---

# Phase 7-A 完了宣言

## 判断

Phase 7-A (Phase 1-2 で取り込み済の知識グラフ全種を Markdown 化) を完了。
**`yohaku sync` 1 コマンドで 43 ファイルが常に最新状態に再生成される** 状態を達成。

## 達成内容

| # | 対象 | 出力先 | yohaku-trial 実機件数 |
|---|---|---|---|
| 7-A1 | Flow | `docs/generated/flows/<Name>.md` | 1 |
| 7-A2 | ApexClass | `docs/generated/apex/<Name>.md` | 20 |
| 7-A3 | ApexTrigger | `docs/generated/triggers/<Name>.md` | 2 |
| 7-A4a | PermissionSet | `docs/generated/permissions/permission-sets/<Name>.md` | 4 |
| 7-A4b | Profile | `docs/generated/permissions/profiles/<Name>.md` | 0 (yohaku-trial には Profile 無し) |
| 7-A4c | ValidationRule | `docs/generated/validation-rules/<Name>.md` | 6 |
| 既存 | system-index + objects | (Phase 1〜2) | 11 |
| **合計** | — | — | **43 ファイル / sync 1 コマンド** |

各 Markdown は **3 種ブロック** (DETERMINISTIC / AI_MANAGED / HUMAN_MANAGED) 構造で、
`yohaku sync` 再実行で **HUMAN_MANAGED ブロックを保護したまま再生成**。

## 設計の核心 (利用者要望への答え)

> 「資料とソースの乖離を OSS で構造的に解消したい」

これに対する Phase 7-A の構造的回答:

| 利用者の悩み | Phase 7-A の解決 |
|---|---|
| 資料とソースの乖離 | `force-app/` が**唯一の正本**、Markdown は決定的に再生成される派生物。乖離した時点で「Markdown が古い」と確定する |
| ドキュメント更新の手間 | `yohaku sync` 1 コマンドで全種再生成。手作業ゼロ |
| 更新漏れ | 再生成されるので「漏れる」概念が消える |
| ドキュメントとソースのどちらが正か | **常にソース** (`force-app/`)。Markdown は「いま現在の force-app/ の決定的な見え方」 |
| 人手記述の保全 | `HUMAN_MANAGED` ブロックは AI 上書きされない |

## 検証ゲート結果 (yohaku-trial)

```
$ yohaku sync
[yohaku] graph build complete: objects=10 fields=58 flows=1 apex=20
[yohaku] render complete: written=43 archived=0 warnings=0
```

- objects=10, flows=1, apex=20, triggers=2, permission-sets=4, validation-rules=6
- archived=0 (修正済 archive ロジックで深い階層を作らない)
- warnings=0 (HUMAN_MANAGED ブロック保護に問題なし)

## 修正したバグ (Phase 7-A 実装中に検出)

| バグ | 影響 | 修正 |
|---|---|---|
| 同一 subDir に複数エンティティ種別を出すと相互 archive | PermissionSet と Profile が競合 | サブディレクトリを分離 (`permissions/permission-sets/` と `permissions/profiles/`) |
| `archive.ts` の絶対パス処理 | `_archive/<date>/Users/.../docs/generated/...` のような深い階層になっていた | `stripGeneratedPrefix` を書き直し、archiveBaseDir からの相対化を堅牢化 |

## CLI / API の拡張

```bash
yohaku render all                   # 全種一括 (Phase 7-A 新設)
yohaku render flows                 # 個別
yohaku render apex                  # 個別
yohaku render triggers              # 個別
yohaku render permissions           # PermissionSet + Profile 同時
yohaku render validation-rules      # 個別
```

`yohaku sync` も内部で `renderAll` を呼ぶように更新。`yohaku init --bootstrap` も同様。

## Phase 7-A 統計

| 項目 | 値 |
|---|---|
| 新規 eta テンプレート | 6 (flow, apex-class, apex-trigger, permission-set, profile, validation-rule) |
| 新規 render 関数 | 6 (renderFlows, renderApex, renderApexTriggers, renderPermissions, renderValidationRules, renderAll) |
| 修正したバグ | 2 (同一 subDir 競合、archive パス処理) |
| 全テスト件数 | 107/107 pass (Phase 6 末から +0、回帰なし) |
| yohaku-trial で render される件数 | 43 ファイル (前回 11 → +32) |

## 残課題 (Phase 7-B 以降へ)

- **Phase 7-B**: 取り込み拡充 (ApprovalProcess / Layout / RecordType / CustomMetadataType / LWC / Aura / etc.)
- **Phase 7-C**: 横断ドキュメント (ER 図 / 自動化マトリクス / 権限マトリクス / 依存グラフ / ヘルスレポート)
- **Phase 7-D**: AI 改善案セクション (各 Markdown の `concerns` ブロックを AI 自動生成)
- **Phase 7-E**: 上層部・承認者向け資料 (Executive Summary / Architecture / Security / Risk Board)

## 関連ナレッジ

- decisions/[Phase 7 計画](./2026-05-08-phase-7-plan.md)
- decisions/[HUMAN_MANAGED マージ仕様](./2026-05-07-human-managed-merge-algorithm.md)
- IMPLEMENTATION_GUIDE.md Phase 7

## 次の動き

**Phase 7-B (取り込み拡充)** のうち最重要の **ApprovalProcess** から着手予定。利用者要望の「承認プロセスをドキュメント化」を最優先で対応する。
