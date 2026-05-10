---
description: 指定した Apex / Flow / Trigger の AI_MANAGED ブロック (purpose / concerns / narrative) を、ソースを読んで自然言語で埋める。HUMAN_MANAGED と DETERMINISTIC は触らない。
argument-hint: <kind> <fullyQualifiedName> [project-root]
---

# /sfai-explain

`$ARGUMENTS` で指定された対象の **AI_MANAGED ブロックだけ** を、ソースコードから読み取った内容に基づいて自然言語で書き換える。

## 引数

```
/sfai-explain apexClass AccountBalanceService
/sfai-explain apexTrigger OrderTrigger
/sfai-explain flow Order_AutoCreateShipmentOnApproval
/sfai-explain apexClass AccountBalanceService /Users/me/work/sfai-trial
```

第 3 引数が無ければカレントディレクトリを project-root として扱う。

## 厳守ルール (絶対)

1. **AI_MANAGED ブロック以外は変更しない**
   - DETERMINISTIC ブロックは `sfai sync` 専管。手で書き換えると次回の sync で必ず上書きされる
   - HUMAN_MANAGED ブロックは利用者の領域。AI が触ったらバグ
2. **マーカー (`<!-- AI_MANAGED_START id="..." -->` / `<!-- AI_MANAGED_END id="..." -->`) を破壊しない**
3. **書き戻しは必ず `sfai explain-write` 経由**
   - 直接 `Edit` ツールで Markdown を編集してはいけない (マーカー破壊リスクが高い)
4. **再現性**: 同じソースを与えたら 2 度目の実行でも本質的に同じ説明を出す。乱数的言い回しを避ける

## 実行手順

### Step 1: 入力を解釈する

引数 `$ARGUMENTS` を空白区切りで `kind`, `fqn`, `projectRoot?` に分解する。

| kind | 期待値 |
|---|---|
| `apexClass` | `AccountBalanceService` |
| `apexTrigger` | `OrderTrigger` |
| `flow` | `Order_AutoCreateShipmentOnApproval` |

### Step 2: ソースとメタを集める

`projectRoot` を起点に以下を **Read ツール** で読む:

- ソースファイル
  - `apexClass`: `force-app/main/default/classes/<fqn>.cls`
  - `apexTrigger`: `force-app/main/default/triggers/<fqn>.trigger`
  - `flow`: `force-app/main/default/flows/<fqn>.flow-meta.xml`
- 既存 Markdown (DETERMINISTIC セクションを参考にする)
  - `apexClass`: `docs/generated/apex/<fqn>.md`
  - `apexTrigger`: `docs/generated/triggers/<fqn>.md`
  - `flow`: `docs/generated/flows/<fqn>.md`

### Step 3: AI_MANAGED ブロックの内容を生成する

各ブロックに対して、以下の方針で日本語で記述する:

**`purpose` (apexClass / apexTrigger / flow)**

- 1〜3 文。何を達成するか、いつ呼ばれるか、副作用があれば明示
- 「**メソッド名/フィールド名は引用符で囲む**」 (例: `recalculate`)
- 推測した部分には「(推測)」と末尾に明示
- 制御フロー Mermaid (DETERMINISTIC) と矛盾しない
- 例:
  - Apex: 「`Account.Outstanding_Balance__c` を未払い `Invoice__c` の合計で再計算し、`Risk_Tier__c` を自動判定する。`AccountTrigger` から呼び出される (推測)。」
  - Flow: 「`Order__c.Status__c` が `Approved` に変わった瞬間に `Shipment__c` を 1 件自動作成する。RecordAfterSave トリガで起動。」

**`concerns` (apexClass / apexTrigger / flow)**

- 自動検出された懸念 (DETERMINISTIC `auto-concerns`) **を繰り返さない**
- 業務観点・運用観点で、自動検出に出ない懸念があれば 0〜3 件
- 無ければ `(なし)` の 1 行で終わらせる

**`narrative` (system-overview, executive-summary, executive-risks のみ)**

- このコマンドのスコープ外。触らない。

### Step 4: 書き戻し

各ブロックの本文を JSON ファイルに書き出して `sfai explain-write` を呼ぶ。

```bash
sfai explain-write --kind <kind> --fqn <fqn> --project-root <root> --input <tmp.json>
```

JSON 形式:

```json
{
  "purpose": "...",
  "concerns": "..."
}
```

`sfai explain-write` は **指定された AI_MANAGED ブロックだけ** を `replaceBlockContent` 経由で差し替える。指定されていない id は触らない。

### Step 5: 動作確認

書き戻し後、再度 Markdown を Read で読み、

1. AI_MANAGED ブロックが意図通り更新されている
2. DETERMINISTIC / HUMAN_MANAGED セクションが破壊されていない
3. 全体の Markdown が読める形を保っている

を 1 回だけ目視確認する。問題があれば utf-8 や改行コードの観点で報告する。

## エラー時の振る舞い

- ソースファイルが存在しない → 利用者に報告して終了
- 既存 Markdown が無い (まだ `sfai sync` していない) → 「先に `sfai sync` を実行してください」と案内
- `sfai explain-write` が失敗 → エラー出力をそのまま提示し、勝手に再試行しない

## 参考

- AI_MANAGED マーカー仕様: `.agents/knowledge/decisions/2026-05-07-human-managed-merge-algorithm.md`
- 設計原則 (3 層分離): `IMPLEMENTATION_GUIDE.md` § 貫く設計原則
