# 導入プロファイルの選び方

`sfai init --profile <minimal|standard|full>` で 3 つのプロファイルから選択できる。

## 比較表 (Phase 6 時点で確定)

| 項目 | minimal | standard | full |
|---|---|---|---|
| **想定対象** | 中小企業 / リソース最小 / 試用 | 通常運用 (中堅) | 大企業 / ベンダー本格運用 |
| **slash commands** | `/onboard` `/explain` `/impact` | minimal + `/classify-diff` `/change-summary` | standard + `/release-prep` `/manual-steps` |
| **subagents** | graph-querier / object-documenter | minimal + onboarding-guide / review-assistant / classifier 5 種 | standard + release-advisor / customer-impact-explainer / manual-step-extractor / release-composer / rollback-drafter |
| **knowledge graph + render** | ✅ | ✅ | ✅ |
| **オンボーディング (新規参画者)** | ✅ 基本 | ✅ persona 別 (new_joiner / reviewer) | ✅ 4 persona 全対応 |
| **差分意味づけ (`/classify-diff`)** | — | ✅ Phase 3 | ✅ |
| **リリース準備 (`/release-prep`)** | — | — | ✅ Phase 4 |
| **DX MCP アダプタ (将来)** | — | — | ✅ Phase 6 stub / Phase 7 本実装 |
| **AI コスト目安 (1 セッション)** | < $0.05 | $0.10 〜 $0.50 | $0.30 〜 $1.00 |

## 推奨

- **「とりあえず触ってみたい」** → **minimal**
  - 1 オブジェクトの構造を把握する程度なら十分
  - `/onboard` で全体像、`/explain Account` で詳細

- **「日常運用で使いたい」** → **standard**
  - PR レビューで `/classify-diff` を活用
  - 新規参画者に `/onboard --role new_joiner` を推奨
  - 経験者に `/onboard --role reviewer`

- **「ベンダー / SIer として本格導入」** → **full**
  - リリースごとに `/release-prep` で 6 セクションドキュメント生成
  - 4 persona 全部使い、顧客説明にも `/onboard --role customer-facing`
  - 手動作業レジストリで横断管理

## profile 別の使えるコマンド早見表

```
                    minimal  standard  full
sfai sync              ✅       ✅      ✅
sfai diff              ✅       ✅      ✅
sfai onboard context   ✅       ✅      ✅
sfai onboard state     ✅       ✅      ✅
sfai onboard faq       ✅       ✅      ✅
sfai metrics           ✅       ✅      ✅
/onboard               ✅       ✅      ✅
/explain               ✅       ✅      ✅
/impact                ✅       ✅      ✅
/classify-diff         —        ✅      ✅
/change-summary        —        ✅      ✅
/release-prep          —        —       ✅
/manual-steps          —        —       ✅
```

## 後から切り替え

`sfai init --profile <name> --conflict overwrite` で再 init すれば差し替え可能。

```bash
# minimal → full にアップグレード
sfai init --profile full --conflict overwrite
```

**HUMAN_MANAGED ブロックは保護されるため、人手記述が消える心配はなし**。

## カスタマイズ (上級者向け)

`.claude/agents/` `.claude/commands/` を直接編集することで個別 enable/disable 可能。プロファイルはあくまでデフォルト設定。
