# Developer Edition で yohaku を検証する手順

> 想定: 会社プロジェクトのソースを使えないので、**自分の Salesforce Developer Edition 組織** を新規取得して、そこにダミーデータを入れて `yohaku` の検証ゲートに使う。
> 所要時間: **45〜60 分** (Dev Edition 取得 15min + メタデータ作成 20min + yohaku 検証 20min)

---

## ステップ 1: Salesforce Developer Edition 組織を取得 (15 分)

1. **サインアップ**: [https://developer.salesforce.com/signup](https://developer.salesforce.com/signup)
2. メールアドレス・氏名・国 (Japan)・ユーザ名 (世界一意、メールっぽく `your-name+yohaku@example.com` 等) を入力
3. パスワード設定メールが届く → パスワードを設定してログイン
4. ログイン後の URL `https://<your-domain>.develop.my.salesforce.com` を控えておく
5. (任意) Setup → Company Information → API Version を確認 (本書では 62.0 想定)

> **Tip**: Dev Edition は 200 ユーザ・5GB ストレージ無料。ダミーデータ検証には十分。

---

## ステップ 2: sf CLI で組織を認証 (5 分)

```bash
# sf CLI 未導入なら
npm install -g @salesforce/cli

# 認証 (ブラウザが開くのでサインイン)
sf org login web --alias ai-yohaku --instance-url https://login.salesforce.com

# 認証確認
sf org list
```

---

## ステップ 3: ダミー Salesforce DX プロジェクトを作成 (5 分)

ローカルに作業ディレクトリを作る:

```bash
sf project generate --name yohaku-trial --output-dir ~/Desktop
cd ~/Desktop/yohaku-trial
ls
# → force-app/ sfdx-project.json README.md ...
```

`sfdx-project.json` を確認:

```bash
cat sfdx-project.json
```

`packageDirectories: [{ "path": "force-app", "default": true }]` であることを確認。

---

## ステップ 4: ダミー Custom Object を作成 (15 分)

### 方針

会社プロジェクトのオブジェクトを真似ない。**架空の "Customer / Order ドメイン"** を Dev Edition 内で作る:

- `Customer__c` (Custom Object): 名前、Tier (Picklist)
- `Order__c` (Custom Object): 注文、Customer__c への Lookup、Total__c (Currency)
- `OrderTrigger` (Apex Trigger): Order__c の before insert

### 簡単に始めるなら sample-project を使う

```bash
cp -r /path/to/yohakuforce/examples/sample-project/force-app ~/Desktop/yohaku-trial/
```

これで上記のメタデータがローカルに置かれる。

### Salesforce 組織にデプロイ (オプション)

ローカルメタデータを Dev Edition へ:

```bash
cd ~/Desktop/yohaku-trial
sf project deploy start --target-org yohaku-dev
```

> 注意: `yohaku` の検証だけなら **デプロイは不要**。ローカルメタデータがあれば `yohaku graph build` は動く。
> ただし retrieve の本番動作確認をしたいならデプロイしておくと良い。

### 既存組織からメタデータを取得する (デプロイ後)

```bash
sf project retrieve start --target-org yohaku-dev --metadata CustomObject:Customer__c,CustomObject:Order__c,ApexClass,ApexTrigger
```

---

## ステップ 5: yohaku を初期化 + 検証実行 (15 分)

### 5-1. yohaku を起動可能にする

```bash
# yohakuforce リポジトリで一度ビルドしておく
cd /path/to/yohakuforce
npm install
npm run build

# 利用方法 A: フルパスで叩く
alias yohaku="node /path/to/yohakuforce/packages/core/dist/cli.js"

# 利用方法 B: npm link
npm link --workspace @yohakuforce/core
which yohaku
```

### 5-2. trial プロジェクトで yohaku init

```bash
cd ~/Desktop/yohaku-trial
yohaku init --profile minimal --project-name yohaku-trial --language ja
```

確認:

```bash
ls -la
ls .claude/commands .claude/agents .agents/knowledge
cat CLAUDE.md | head -20
```

### 5-3. graph build

```bash
yohaku graph build
# → [yohaku] graph build complete: objects=2 fields=3 flows=0 apex=1
```

### 5-4. グラフ確認

```bash
yohaku graph query "SELECT fqn, label FROM objects"
yohaku graph query "SELECT * FROM dependencies"
yohaku graph query "SELECT object, COUNT(*) AS cnt FROM fields GROUP BY object"
```

### 5-5. 派生ドキュメント

```bash
yohaku render system-index
yohaku render objects
ls docs/generated/
ls docs/generated/objects/
cat docs/generated/objects/Customer__c.md
```

### 5-6. HUMAN_MANAGED 保護を体感

```bash
# Customer__c.md の HUMAN_MANAGED ブロックに人手で記入
# (例: business-context に「ABC ドメインの顧客マスタ。担当: 自分」)

# 再 render
yohaku render objects

# 内容が保持されているか確認
grep -A3 'HUMAN_MANAGED_START id="business-context"' docs/generated/objects/Claim__c.md
```

---

## ステップ 6: Claude Code から /onboard を起動 (検証ゲート本番)

1. Claude Code でプロジェクトディレクトリ (`~/Desktop/yohaku-trial`) を開く
2. プロンプトで:
  ```
   /onboard
  ```
3. `onboarding-guide` サブエージェント (standard 以上) または直接応答 (minimal) で全体像が提示される
4. 続けて:
  ```
   /explain Customer__c
   /impact Customer__c
  ```
5. 期待する応答:
  - `/explain` → フィールド一覧、Lookup 関係、HUMAN_MANAGED で書いた業務注記の引用
  - `/impact` → `Order__c.Customer__c` (Lookup) と `OrderTrigger` (triggers) が依存元として表示

---

## ステップ 7: フィードバックの記録

検証ゲートとして以下を記録する:


| 指標                                             | 計測方法                                           |
| ---------------------------------------------- | ---------------------------------------------- |
| `yohaku init` から `/onboard` 完走までの所要時間            | ストップウォッチ / 時刻記録                                |
| 主要オブジェクト (Customer / Order) 2 件の理解度 (5 段階自己評価) | 完走後の自己採点                                       |
| エラー / つまずき件数                                   | リスト化、本リポジトリの `.agents/knowledge/pitfalls/` に記録 |
| 主観的ストレス指標 (NPS / 5 段階)                         | 1〜5 で記入                                        |
| 「30 分以内に新規参画者が理解できそうか」                         | Yes / No / 微妙                                  |


記録例:

```markdown
date: 2026-05-08
duration: 28 minutes
understanding: 4/5 (Order の Total__c がなぜ Currency なのか即は分からなかった)
errors: 1 件 (sf CLI が古かったので update が必要だった)
stress: 4/5 (準備は手数多いが本番動作は快適)
verdict: 「Yes、ただし Dev Edition 取得を込みで考えるとオンボーディングは 1 時間が現実的」
```

このフィードバックを `yohakuforce` リポジトリの `.agents/knowledge/retrospectives/<date>-cycle-2-8-validation-gate.md` として残す。

---

## トラブルシュート

### `yohaku graph build` で `objects=0` が出る

- `sfdx-project.json` の `packageDirectories` を確認
- ファイル拡張子が `.object-meta.xml` になっているか確認 (Salesforce DX 標準)

### `sf project deploy` で権限エラー

- Dev Edition の管理者ユーザでログインしているか確認
- 試しに `sf org display --target-org yohaku-dev` で接続確認

### Claude Code で `/onboard` が見つからない

- `.claude/commands/onboard.md` が `yohaku init` で作成されているか確認
- ファイル名が `.eta` のままなら init が走っていない

### Dev Edition のセッションが切れた

- `sf org login web --alias yohaku-dev` を再実行

---

## 完走できたら

- 計測データを `.agents/knowledge/retrospectives/<date>-cycle-2-8-validation-gate.md` に記録
- バグ / 違和感は `.agents/knowledge/pitfalls/` に新規追加
- 次サイクル (Phase 3 以降) の課題提起を行う

