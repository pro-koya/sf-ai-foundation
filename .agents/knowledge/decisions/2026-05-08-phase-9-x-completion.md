---
type: decision
date: 2026-05-08
title: Phase 9.x 完了 — ApprovalProcess / SharingRules / PermissionSet 権限マトリクスの取り込み
status: active
tags: [phase-9, completion, approval-process, sharing-rules, permission-set, conditions]
---

# Phase 9.x 完了宣言

## 判断

利用者の指摘「条件絡みのメタデータ (承認プロセス・共有ルール・入力規則) も対象に」のうち、Phase 9 では入力規則 (ValidationRule) を完成。Phase 9.x で残り 2 種 + PermissionSet の権限マトリクスを完成。これで「**Salesforce で条件・権限を扱う主要メタデータすべて**」が同一品質で Markdown 化される。

## 達成内容

| Sub | 取り組み | アウトプット |
|---|---|---|
| 9-B4 | PermissionSet 権限マトリクス | objectPermissions / fieldPermissions / classAccesses / userPermissions を抽出し Markdown 表で可視化。Quick Summary に「完全 CRUD」「強権限 (modifyAll/viewAll)」を強調 |
| 9-B2 | ApprovalProcess 取り込み | 新エンティティ。entryCriteria / approvalStep / 申請/承認/却下/取消 アクション を抽出。段階承認の Mermaid 図 (申請 → step1 → step2 → 最終承認/却下) を生成 |
| 9-B3 | SharingRules 取り込み | criteriaBased / ownerBased を 1 ファイル内の複数ルールから展開。条件は **自然語表記** (`Net_Amount__c が 1000000 より大きい`) で出力 |

## yohaku-trial での実機検証

### 新規 fixture (今回追加)

| ファイル | 件数 |
|---|---|
| `force-app/main/default/approvalProcesses/Order__c.HighValueApproval.approvalProcess-meta.xml` | 1 (2 段階承認) |
| `force-app/main/default/sharingRules/Order__c.sharingRules-meta.xml` | 内部に 3 ルール (条件 2 + オーナー 1) |

### 生成結果

```
$ yohaku sync
[yohaku] graph build complete: objects=10 fields=58 flows=1 apex=20
[yohaku] render complete: written=53 archived=0 warnings=0
```

| 種別 | 件数 (Phase 9 末 → 9.x 末) | 主要強化 |
|---|---|---|
| 全 Markdown | 49 → **53** | +4 (ApprovalProcess 1 + SharingRule 3) |
| PermissionSet | 4 (内容大幅拡充) | 9 オブジェクト権限テーブル + 20 フィールド権限テーブル + 3 Apex |
| ApprovalProcess | 0 → 1 | 段階承認 Mermaid + 全アクション + Quick Summary |
| SharingRules | 0 → 3 | criteriaBased / ownerBased 双方、条件は自然語化 |
| system-index | 11 行 → 13 行 | ApprovalProcess + SharingRules カウント追加 |

### サンプル — ApprovalProcess の Quick Summary

```
> **Active な承認プロセス** (対象: `Order__c`、ステップ 2 段階)。
> エントリ条件: `Order__c.Net_Amount__c` greaterThan `500000` / `Order__c.Status__c` equals `Submitted`。
> 段階: 1. 営業マネージャ承認 → 2. 経理マネージャ承認。
> 概要: 純額が一定額を超える受注に対して、営業マネージャ → 経理マネージャの 2 段階承認を行う
```

### サンプル — SharingRule の自然語化

原文 XML criteria:

```xml
<criteriaItems>
  <field>Order__c.Net_Amount__c</field><operation>greaterThan</operation><value>1000000</value>
</criteriaItems>
```

自然語:

```
Boolean filter: `1 AND 2`
1. `Order__c.Net_Amount__c` が `1000000` より大きい
2. `Order__c.Status__c` が `Approved` に等しい
```

### サンプル — PermissionSet `SalesOps` のマトリクス

```
**権限セット** (License 指定なし)。 内訳: オブジェクト権限 9 / フィールド権限 20 / Apex クラス 3。 完全 CRUD: `Order_Line__c`。

| オブジェクト | C | R | U | D | View All | Modify All |
| `Order_Line__c` | ✓ | ✓ | ✓ | ✓ | — | — |
| `Order__c` | ✓ | ✓ | ✓ | — | — | — |
...
```

## 統計

| 項目 | Phase 9 末 | Phase 9.x 完了時 |
|---|---|---|
| Test Files | 30 | **33** |
| Tests | 196 | **209 (+13)** |
| 取り込み対応エンティティ | 9 種 | **11 種** (+ ApprovalProcess + SharingRules) |
| yohaku-trial で生成される Markdown | 49 | **53** |
| AI_MANAGED 保全 (Phase 8 機能) | 動作 | 5 サイクル目の sync 後も維持を確認 |

## 修正したバグ (Phase 9.x)

| バグ | 影響 | 修正 |
|---|---|---|
| `ifNotMetLabel` を eta テンプレで bare 関数として呼んでいた | render エラー | テンプレ側で `it.ifNotMetLabel(...)` に変更し render データに渡す |
| SharingRule の自然語が「が `Approved`」となり動詞抜け | 読みにくい | criteria → 自然文形式 (「が ~ に等しい」「~ より大きい」等) に再設計 |

## merge 仕様への影響

Phase 8 で導入した「customized AI_MANAGED は保全」規則は ApprovalProcess / SharingRule / 強化された PermissionSet テンプレでも同じく機能。これらの新エンティティに `/yohaku-explain` を当てる UX も Phase 8 の経路をそのまま使える。

## 残課題 (Phase 10 以降の候補)

- **Layout / FlexiPage / Lightning App** の取り込み (UI レイアウト層)
- **CustomMetadataType** (.md / .md-meta.xml) の取り込み
- **NamedCredential / RemoteSiteSetting** (連携設定の可視化)
- **LWC / Aura** の取り込み (テンプレ + JS の対応)
- **Profile body** (現在は メタ情報のみ。PermissionSet と同等に拡充)
- **再現性 CI**: `/yohaku-explain` を温度 0 / プロンプトハッシュ / N-run 一致でテスト

## 関連ナレッジ

- decisions/[Phase 9 計画](./2026-05-08-phase-9-plan.md)
- decisions/[Phase 9 完了](./2026-05-08-phase-9-completion.md)
- decisions/[Phase 8 完了](./2026-05-08-phase-8-completion.md)
- decisions/[Phase 7 完了](./2026-05-08-phase-7-completion.md)
