---
type: win
date: 2026-05-11
title: 機密プロジェクト導入前の事前監査と Phase 内対処 (規律 §3.2 の初実例)
status: completed
tags: [v0.3.0, week-0, security, scope-discipline, pre-deployment-audit]
---

# 機密プロジェクト導入前の事前監査と Phase 内対処

## 何が効いたか

v0.3.0 (内部検証実証) の Week 0 着手前に、利用者から「機密性が極めて高いプロジェクトに入れるので脆弱性があったら一発アウト」と要求があり、3 系統並列 (security-reviewer agent + typescript-reviewer agent + npm audit) で事前監査を実施。**CRITICAL 1 + HIGH 5 + MEDIUM 5 + 推奨 1 の計 12 件** を検出し、即日修正 → 再監査 → GO 判定 → commit/push まで完走した。

## 効いた設計判断

### 1. 3 系統並列監査によるクロス検証

- `security-reviewer` (OWASP 全般) + `typescript-reviewer` (Node/TS 固有) + `npm audit` (依存)
- 同じ脆弱性 (例: CRIT-1 の `sfai graph query`) を 2 つのエージェントが独立に指摘 → 信頼度が上がる
- 別観点 (HIGH-2 ReDoS は typescript-reviewer のみが指摘) で網羅性も担保

### 2. v0.3.0 の Out of Scope ではなく Week 0 タスク B (pitfalls 解消) として吸収

[Phase スコープ規律 ADR](../decisions/2026-05-10-scope-discipline-and-phase-restructure.md) の §3.2「進行中の発見は原則 Phase 内で対処」に従い、新 Phase (例: 「Phase 16 = セキュリティ修正」) を立てずに **v0.3.0 内** で対処した。これが規律確立後の **最初の実例**。

判断軸:
- 北極星 (実プロジェクトでの実利用実証) の前提条件 → 範囲内
- Phase を分けても作業内容は同じ → 分ける利益なし
- 半日で完了する規模 → Phase 化のコストの方が高い

### 3. 二重防御 (defense in depth) の徹底

- CRIT-1: `readonly: true` モード + SELECT allowlist (どちらかが破られても他方で防御)
- HIGH-2: 静的検出 + 50ms 実行ベンチマーク (パターンの 100% 静的検出は不可能なため実行ガード併設)
- MED-2: マーカー strip + 既存の marker invariant チェック (既存テストが回帰検出してくれる)

### 4. immutable パターンを徹底

`secrets/apply.ts:maskGraphSensitiveFields` は元の `KnowledgeGraph` を一切 mutate せず新オブジェクトを返す。再監査で「Are validationRule[0] same object: false」と検証された (副作用ゼロ確認済)。

[`coding-style.md`](../../../../.claude/rules/coding-style.md) の Immutability ルールが効いた。

### 5. テスト失敗を「修正完成のサイン」として扱う

MED-2 修正後、既存テスト「マーカー数が変化したら例外を投げる」が失敗した。これは **修正の正しさを示す失敗** (既存挙動 = 例外、新挙動 = サイレント strip)。テストを新挙動に合わせて書き直し、より強い保証 (= マーカー断片が完全除去される + マーカー数も保たれる) を追加した。

## 数値

| 指標 | 値 |
|---|---|
| 検出した脆弱性 | CRITICAL 1 + HIGH 5 + MEDIUM 5 + 推奨 1 = **12 件** |
| 修正完了までの所要時間 | 約 4 時間 (監査 1h + 修正 2.5h + 再監査 0.5h) |
| 修正コード規模 | 新規 2 ファイル (`util/path-guard.ts`, `secrets/apply.ts`) + 既存 9 ファイル編集、合計 ≈250 行 |
| 既存テスト pass 率 | 256/256 (1 件は MED-2 の新挙動に合わせて更新) |
| 新 Phase 起案数 | **0** (規律遵守、v0.3.0 Week 0 内で吸収) |
| 検出された false positive | MED-5 (`.claude/settings.local.json` は実は git tracked ではなかった) |

## 再利用したい知見

1. **本番投入前監査は 3 系統並列で**: 単一 agent では取りこぼしがある。OWASP 系 + 言語固有 + 依存スキャナの 3 軸が最低ライン
2. **CONDITIONAL GO は実質 NO-GO 扱いで対処**: 残ガードを 1 つ立てるだけで GO に変わるなら、追加対処してから GO 判定を出す
3. **Phase スコープ規律の威力**: 「12 件の脆弱性 = 12 件の Phase」となれば計画が崩壊する。「v0.3.0 Week 0 のタスク B として吸収」の判断軸 (北極星に必要 + Phase 分けても作業同じ + 短期完了) は再利用できる
4. **テストが修正の正しさを示す失敗** という見方: regression と勘違いせず、新挙動の方が強い保証になっているか吟味する

## 関連ナレッジ

- decisions/[2026-05-10 Phase スコープ規律](../decisions/2026-05-10-scope-discipline-and-phase-restructure.md) — 本ケースが規律 §3.2 の初実例
- decisions/[2026-05-10 v0.3.0 着手計画](../decisions/2026-05-10-v0.3.0-internal-validation-plan.md) — Week 0 タスク B に本作業を組み込み
- pitfalls/[2026-05-09 method-summary-table SOQL 検出漏れ](../pitfalls/2026-05-09-method-summary-table-soql-detection.md) — Week 0 で同時対処予定 (本作業より低優先度)
