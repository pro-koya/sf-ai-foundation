---
type: decision
date: 2026-05-09
title: Phase 14 完了 — AI_MANAGED ブロック自動生成基盤の拡張 (`/sfai-explain` 複数 ID 対応)
status: completed
tags: [phase-14, completion, sfai-explain, ai-managed, multi-id, registry]
---

# Phase 14 完了

## 結果サマリ

| 指標 | 完了前 | 完了後 |
|---|---|---|
| `ExplainKind` のサポート種別 | 3 (apexClass / apexTrigger / flow) | **10** (+ object / lwc / auraBundle / flexiPage / visualforcePage / visualforceComponent / customApplication) |
| AI_MANAGED ブロック ID の妥当性検証 | なし (typo は silently skip) | **Registry 早期エラー** (`block-registry.ts` で一元管理) |
| `/sfai-explain` slash command | 未整備 (CLI のみ) | **scaffold に整備** (slash command + subagent) |
| ユニットテスト件数 | 246 | **256** (+10: registry 検証 9 / apply 拡張 1 / 既存テスト更新 0) |
| `sfai sync` warnings | 0 | **0** (維持) |
| Phase 8 の `purpose` 既存内容 | 保全 | **保全** (回帰なし、再検証済) |

## 実装内容

### 14-A: ExplainKind の 3 → 10 種拡張

`packages/sfai-core/src/explain/index.ts`:
- `ExplainKind` 型に object / lwc / auraBundle / flexiPage / visualforcePage / visualforceComponent / customApplication を追加
- `EXPLAIN_KINDS` 配列を export (CLI バリデーション・テストで使用)
- `KIND_TO_SUBDIR` マップを 10 種に拡張 (各 kind が描画される `docs/generated/<subdir>/` を 1 箇所で管理)

CLI (`cmdExplainWrite`):
- `validKinds` を `EXPLAIN_KINDS` の Set に置き換え
- エラーメッセージを動的生成 (許容値一覧を `EXPLAIN_KINDS.join(" | ")` で出力)

### 14-B: Block ID Registry の新設

`packages/sfai-core/src/explain/block-registry.ts` を新規作成:

```typescript
export const ALLOWED_BLOCK_IDS: Record<ExplainKind, readonly string[]> = {
  apexClass: ["purpose", "concerns", "narrative", "business-scenario",
              "key-design-decisions", "processing-overview-narrative",
              "processing-details-narrative"],
  apexTrigger: ["purpose", "concerns", "narrative", "operational-notes",
                "processing-overview-narrative", "processing-details-narrative"],
  flow: ["purpose", "concerns", "narrative", "business-scenario",
         "operational-notes", "processing-overview-narrative",
         "processing-details-narrative"],
  object: ["summary", "narrative", "business-domain"],
  lwc: ["purpose"],
  auraBundle: ["purpose"],
  flexiPage: ["purpose"],
  visualforcePage: ["purpose", "narrative"],
  visualforceComponent: ["purpose"],
  customApplication: ["purpose", "narrative"],
};
```

設計原則:
- **単一情報源**: 新ブロック追加時はこのファイルだけ更新する → テンプレートと CLI が同期される
- **typo guard**: `applyExplain` が入力 JSON の ID を本 registry と照合し、未知 ID なら早期 throw
- **subagent 整合**: scaffold/.claude/agents/explain-writer.md.eta が同じ ID 一覧で書く指針を持つ

`BLOCK_PURPOSE_DESCRIPTIONS` も同ファイルに定義し、各 ID で「何を書くべきか」の説明を一元化。

### 14-C: applyExplain への registry 検証統合

```typescript
const registry = validateBlockIds(target.kind, Object.keys(input.blocks));
if (!registry.valid) {
  const allowed = ALLOWED_BLOCK_IDS[target.kind].join(", ");
  throw new Error(
    `[explain] Unknown block id(s) for kind="${target.kind}": ${registry.unknown.join(", ")}. Allowed: ${allowed}`,
  );
}
```

- **早期 throw**: 書き込み開始前に typo を検出
- **既存契約は維持**: registry に登録されているが Markdown 上に該当ブロックが無いケース (古い Markdown を新 ID で更新しようとした) は従来通り `skipped` で返す

### 14-D: scaffold に slash command + subagent

新規ファイル 2 つ:

**`scaffold/.claude/commands/sfai-explain.md.eta`**:
- 引数仕様: `<kind> <fqn> [block-id...]`
- 実行手順: graph query → explain-writer subagent → 一時 JSON → `sfai explain-write`
- 各 kind の許容ブロック ID 表 (利用者がコマンド説明を読むだけで何が書けるか分かる)
- 禁則: DETERMINISTIC / HUMAN_MANAGED 不可侵 / 知識グラフ外の情報を捏造しない / 顧客固有情報排除

**`scaffold/.claude/agents/explain-writer.md.eta`**:
- 各ブロック ID 別の **書き方ガイド** (purpose / narrative / business-scenario / operational-notes / business-domain / key-design-decisions / processing-overview-narrative / processing-details-narrative / concerns / summary)
- 入力は DETERMINISTIC ファクトのみ (再生成性を担保)
- 既存の AI_MANAGED / HUMAN_MANAGED は **読まない** (汚染防止)
- 出力例 JSON 付き

### 14-E: テスト追加 (10 件)

`packages/sfai-core/tests/unit/explain/block-registry.test.ts` を新規:
- `validateBlockIds` の正常 / 異常系 4 件
- `EXPLAIN_KINDS` / `ALLOWED_BLOCK_IDS` の網羅性 3 件
- `applyExplain` の object kind 動作 + 不正 ID 早期エラー 2 件

`packages/sfai-core/tests/unit/explain/apply.test.ts` を更新:
- 既存「存在しない id は skipped」を「registered だが Markdown に無い id は skipped」に意味替え
- 「registry に未登録の id は早期エラー」を新規追加

合計 +10 件。Phase 13 の 246 件 → **256 件 pass**。

## 検証 (sfai-trial 実機)

| 検証項目 | 入力 | 結果 |
|---|---|---|
| Apex `AccountBalanceService` に 5 ID 一括書き込み (narrative / business-scenario / key-design-decisions / processing-overview-narrative / processing-details-narrative) | `/tmp/sfai-explain-test/account-balance-service.json` | `updated=5 skipped=0` ✓ |
| Object `Order__c` に 3 ID 書き込み (summary / narrative / business-domain) — **新 kind 動作確認** | `/tmp/sfai-explain-test/order-object.json` | `updated=3 skipped=0` ✓ |
| Flow `Order_AutoCreateShipmentOnApproval` に 4 ID 書き込み | `/tmp/sfai-explain-test/flow.json` | `updated=4 skipped=0` ✓ |
| object kind に `key-design-decisions` を渡した場合の早期エラー | invalid input | `[explain] Unknown block id(s) for kind="object": key-design-decisions. Allowed: summary, narrative, business-domain` (exit=1) ✓ |
| 不正 kind (`invalidKind`) を渡した場合 | invalid kind | `[sfai] invalid --kind: invalidKind (allowed: apexClass \| apexTrigger \| flow \| ...)` (exit=2) ✓ |
| 書き込み後に `sfai sync` を再実行 | — | warnings=0、written=69 維持 ✓ |
| Phase 8 で書かれた `purpose` 内容 (`Account.Outstanding_Balance__c` を未払い `Invoice__c` の合計で...) | — | **完全保全** ✓ |
| Phase 14 で書き込んだ 12 ブロックの内容 | — | **完全保全** ✓ |

## 設計判断のポイント

### Registry の早期 throw vs 従来の lenient skip

旧設計 (Phase 8): 未知 ID は silently skip → AI/CLI ユーザーがタイプミスに気付かない

新設計 (Phase 14): registry 早期 throw + Markdown 不在は skip 継続
- typo は **書き込み開始前** に検出 (例: `naratve` → 即エラー、Markdown は変更されない)
- 「ID は正しいが Markdown に該当ブロックが無い」(= 古い Markdown を新 ID で更新したい) は skipped を維持 → 部分的書き込みが可能

### scaffold/.claude に slash command + subagent を追加した理由

CLI (`sfai explain-write`) は **書き戻し基盤** で、AI 推論は別の場所で実行される設計。Claude Code 環境では:
1. `/sfai-explain` slash command が起動される
2. command が `explain-writer` subagent を呼び出す
3. subagent が知識グラフを query → DETERMINISTIC ファクトを集める → AI で文面生成 → JSON 出力
4. command が `sfai explain-write` で書き戻し

この分離により:
- CLI は決定的 (再現性検証可能)
- AI 推論は claude-code 側 (温度 / モデル / プロンプトの調整可能)
- subagent の prompt が registry と整合 → 書く内容のブレを最小化

### 検証で擬似テキストを使った理由

実 AI 推論は **本 Phase のスコープ外** (Phase 15 以降の「再現性 CI」で扱う)。本 Phase は「書き戻し基盤」と「AI が知るべき指針 (subagent prompt)」までを整備し、書き込み + 保全のフルパスが動作することを確認するのがゴール。

擬似テキストでも以下が検証できる:
- 多 ID JSON 入力 → CLI 経由 → Markdown 反映 (正常系)
- registry 検証 (異常系)
- 書き戻し後の `sfai sync` 再実行で AI_MANAGED が保全されること (Phase 8 の保全契約継承)

実 AI 推論を含めた end-to-end は claude-code 環境で `/sfai-explain` を実行することで実機検証可能。

## 既存仕様との非破壊性

- Phase 8 の `purpose` ブロック保全契約は **完全継承** (`AccountBalanceService.md` で再検証済)
- Phase 9〜13 の AI_MANAGED ブロック (narrative / processing-overview-narrative 等) も registry に正しく登録され、書き戻し可能
- 3 層分離 (DETERMINISTIC / AI_MANAGED / HUMAN_MANAGED) を維持
- HUMAN_MANAGED ブロックには絶対書き込まない (registry に存在しない)
- `sfai sync` warnings=0 を維持

## 残課題 (Phase 15 以降)

- **実 AI 推論との end-to-end**: claude-code 環境で `/sfai-explain` slash command を実機実行し、explain-writer subagent が DETERMINISTIC のみから自然文を生成するフローの検証
- **再現性 CI**: 温度 0 / プロンプトハッシュ / N-run 一致で AI 出力を固定する仕組み
- **再生成時の差分検出**: 既存 AI_MANAGED と新規生成の差分を表示し、ユーザーがレビューできる UX
- **横断ドキュメント**: 権限マトリクス / 自動化マトリクス
- **路線 C (公開準備)**: GitHub Issue/PR テンプレ / `docs/01-getting-started/` 充実

## 関連ナレッジ

- decisions/[Phase 14 着手計画](./2026-05-09-phase-14-plan.md)
- decisions/[Phase 13 完了](./2026-05-09-phase-13-completion.md)
- decisions/[Phase 8 完了](./2026-05-08-phase-8-completion.md) (`applyExplain` の正本 / `purpose` 保全要件)
