---
type: decision
date: 2026-05-08
title: Phase 10 完了 — Profile / Layout / CustomMetadata / NamedCredential / RemoteSiteSetting
status: active
tags: [phase-10, completion, profile, layout, custom-metadata, named-credential, remote-site, security]
---

# Phase 10 完了宣言

## 判断

Phase 10 (Profile body 拡充 + Layout + CustomMetadata + NamedCredential + RemoteSiteSetting の取り込み) を完了。Salesforce 構築の **権限境界 / UI / 設定外出し / 外部連携** の 4 大カテゴリを同一品質で Markdown 化できる状態に到達。

## 達成内容

| Sub | 取り組み | アウトプット |
|---|---|---|
| 10-A | Profile body 拡充 | PermissionSet 用の `extractPermissionSetBody` を Profile にも流用。同一形式の権限マトリクス (objectPermissions / fieldPermissions / classAccesses / userPermissions) を出力。Quick Summary に強権限警告を含む |
| 10-B | Layout 取り込み | `*.layout-meta.xml` から sections / 列 / フィールド / 関連リスト / クイックアクションを抽出し Markdown テーブル化 |
| 10-C | CustomMetadata Record 取り込み | `*.md-meta.xml` から Type / RecordName / values を抽出。Quick Summary に主要値 3 個を要約 |
| 10-D | NamedCredential + RemoteSiteSetting | エンドポイント / プロトコル / 有効状態を取り込み。**シークレット (password / oauthToken 等) は値を一切出さず存在のみ表示**。実機検証で実際の SECRET 文字列が出力に出ないことを確認 |

## sfai-trial fixture (Phase 10 で追加)

| ファイル | 種別 | 件数 |
|---|---|---|
| `profiles/SalesUser.profile-meta.xml` | Profile | 1 |
| `layouts/Order__c-Order Layout.layout-meta.xml` | Layout | 1 |
| `objects/Tax_Setting__mdt/Tax_Setting__mdt.object-meta.xml` | CustomObject (CMT type) | 1 |
| `customMetadata/Tax_Setting__mdt.JP_{Standard,Reduced}.md-meta.xml` | CustomMetadataRecord | 2 |
| `namedCredentials/EDI_Service.namedCredential-meta.xml` | NamedCredential (秘密値含む) | 1 |
| `remoteSiteSettings/EdiService.remoteSite-meta.xml` | RemoteSiteSetting | 1 |

## sfai-trial 実機検証

```
$ sfai sync
[sfai] graph build complete: objects=11 fields=58 flows=1 apex=20
[sfai] render complete: written=60 archived=0 warnings=0
```

| 種別 | Phase 9.x 末 → Phase 10 末 |
|---|---|
| 全 Markdown | 53 → **60** (+7) |
| Profile | 0 → 1 (権限マトリクス完備) |
| Layout | 0 → 1 |
| CustomMetadata | 0 → 2 |
| NamedCredential | 0 → 1 |
| RemoteSiteSetting | 0 → 1 |

### セキュリティ検証 (10-D)

NamedCredential fixture には `<password>SECRET_PASSWORD_PLACEHOLDER</password>` を含めたが、生成された `EDI_Service.md` を grep した結果 **`SECRET_PASSWORD` も `SECRET` も含まれていない** ことを確認。Quick Summary に「⚠ シークレット情報あり (値は本書に出力しない)」と警告のみ表示される。

### サンプル — Profile Quick Summary

```
> **Profile** (User License: `Salesforce`)。 内訳: オブジェクト権限 3 / フィールド権限 2 / Apex クラス 1 / ユーザ権限 2。
```

### サンプル — CustomMetadata Quick Summary

```
> **CustomMetadata レコード** (Type: `Tax_Setting__mdt`、Record: `JP_Standard`)。値 3 個。 Label: 日本 標準税率。 主要値: `Country__c`=`JP`, `Rate__c`=`0.10`, `Effective_From__c`=`2019-10-01`。
```

## 統計

| 項目 | Phase 9.x 末 | Phase 10 完了時 |
|---|---|---|
| Test Files | 33 | **34** |
| Tests | 209 | **214 (+5)** |
| 取り込み対応エンティティ | 11 種 | **15 種** (+ Layout / CMR / NamedCredential / RemoteSiteSetting) |
| sfai-trial で生成される Markdown | 53 | **60** |
| AI_MANAGED 保全 (Phase 8 機能) | 動作 | 6 サイクル目の sync 後も維持を確認 |

## 設計上の注意点 (Phase 10 で確立)

1. **シークレット保護パターン**: 拡張可能な `SECRET_TAGS` リストでパスワード/OAuth/証明書系のタグを羅列し、存在検出のみを返す `hasSecret: boolean` フラグだけ生成。値そのものは graph にも Markdown にも残さない
2. **Profile = PermissionSet**: 内部的には同じ body 構造を共有することで重複実装を回避 (`extractPermissionSetBody` を両方が呼ぶ)
3. **適合 fixture を必ず先に追加**: 利用者ご指示の「念入り検証」の実装。Phase 10 では 4 種すべてに `sfai-trial` の最低 1 fixture を追加してから実装→検証

## 残課題 (Phase 11 以降)

- **LWC / Aura 取り込み** (多ファイル構造で別設計が必要)
- **FlexiPage / Lightning App** (UI レイアウトの延長線)
- **再現性 CI**: `/sfai-explain` を温度 0 / プロンプトハッシュ / N-run 一致でテスト
- **CustomMetadataType 自体 (object-meta.xml)** の専用テンプレ (現状は CustomObject として描画される)
- **Profile の field-level security 完全表現** (大規模 Profile では全フィールドの readable/editable 一覧が肥大化する → 折り畳み or サマリ化を検討)

## 関連ナレッジ

- decisions/[Phase 10 計画](./2026-05-08-phase-10-plan.md)
- decisions/[Phase 9.x 完了](./2026-05-08-phase-9-x-completion.md)
- decisions/[Phase 9 完了](./2026-05-08-phase-9-completion.md)
- decisions/[Phase 8 完了](./2026-05-08-phase-8-completion.md)
- decisions/[Phase 7 完了](./2026-05-08-phase-7-completion.md) (Phase 7-B 拡張パターンの正本)
