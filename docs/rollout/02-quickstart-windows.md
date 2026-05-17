# yohakuforce — Windows 環境 Quickstart

> 対象: Windows PC を使用する Salesforce 開発メンバー  
> 所要時間: セットアップ 20〜30 分程度  
> 確認環境: Windows 10 / 11（PowerShell 使用）

---

## 前提条件

以下が PC に入っていることを確認してください。

| ツール | 必要バージョン | 確認コマンド |
|---|---|---|
| Node.js | 20 以上 | `node --version` |
| Git | 任意（最新推奨） | `git --version` |
| Claude Code CLI | 最新版 | `claude --version` |

---

## Step 1: Node.js 20+ のインストール

1. [https://nodejs.org/](https://nodejs.org/) にアクセスし、**LTS 版（20 以上）** をダウンロードします。
2. インストーラーを実行し、デフォルト設定で進めます。
3. PowerShell を**新規で開き直して**から確認します。

```powershell
node --version
# v20.x.x 以上が表示されれば OK
npm --version
# 10.x.x 前後が表示されれば OK
```

---

## Step 2: Git のインストール（未導入の場合）

1. [https://git-scm.com/download/win](https://git-scm.com/download/win) からインストーラーをダウンロードします。
2. インストール時は「Use Git from the Windows Command Prompt」を選択します。

```powershell
git --version
# git version 2.x.x が表示されれば OK
```

---

## Step 3: Claude Code CLI のインストール

```powershell
npm install -g @anthropic-ai/claude-code
claude --version
# Claude Code のバージョンが表示されれば OK
```

インストール後、初回起動時にブラウザでの認証が求められます。画面の指示に従って認証してください。

---

## Step 4: リポジトリの clone

作業ディレクトリを決めて、リポジトリを clone します。

```powershell
# 例: ドキュメントフォルダ配下に配置する場合
cd $env:USERPROFILE\Documents

git clone https://github.com/yohakuforce/core.git yohakuforce
cd yohakuforce
```

---

## Step 5: 依存パッケージのインストール

```powershell
npm install
```

完了したら、ビルドを確認します。

```powershell
npm run build
# エラーなく完了すれば OK
```

---

## Step 6: `yohaku` コマンドの確認

```powershell
node packages/core/dist/cli.js --version
# バージョン番号が表示されれば OK
```

毎回このパスを打つのが手間な場合は、グローバルにリンクを張ります。

```powershell
npm link --workspace=packages/core
yohaku --version
# これで yohaku コマンドが使えるようになります
```

---

## Step 7: サンプルプロジェクトで動作確認

`examples/sample-project/` を使って動作を確認します。

```powershell
cd examples\sample-project

# 知識グラフのビルド
yohaku graph build

# Markdown ドキュメントの生成
yohaku render

# 生成されたドキュメントの確認
dir docs\generated\
```

`docs\generated\` 配下にファイルが生成されれば、セットアップ完了です。

---

## Step 8: Claude Code との連携確認

プロジェクトのルートディレクトリで Claude Code を起動します。

```powershell
# yohakuforce ディレクトリで
claude
```

起動後、以下を入力して応答を確認します。

```
/onboard
```

プロジェクトの概要説明が開始されれば、連携が正常に機能しています。

---

## トラブルシュート

### よくある問題 1: `yohaku` コマンドが見つからない

**症状**: `yohaku: command not found` または `yohaku は認識されていません`

**対処**:

```powershell
# npm link が効いているか確認
npm list -g --depth=0

# 効いていない場合、再実行
npm link --workspace=packages/core

# それでも解消しない場合、フルパスで実行
node C:\Users\<username>\Documents\yohakuforce\packages\core\dist\cli.js --version
```

---

### よくある問題 2: `npm install` 時に権限エラーが出る

**症状**: `EACCES` や `EPERM` エラー

**対処**:

PowerShell を**管理者として実行**してから `npm install` を再実行してください。

スタートメニューで PowerShell を右クリック → 「管理者として実行」を選択します。

---

### よくある問題 3: `yohaku graph build` でパスエラーが出る

**症状**: `GraphSchemaValidationError` が表示される

**対処**:

v0.2.2 以降は Windows のパス区切り（バックスラッシュ）に対応済みです。バージョンを確認してください。

```powershell
yohaku --version
# 0.2.2 以上であることを確認
```

古いバージョンの場合は `git pull` して `npm install && npm run build` を再実行してください。

---

*セットアップが完了したら、`03-hands-on-script.md` のデモ手順に進んでください。*
