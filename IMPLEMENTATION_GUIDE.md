# Salesforce AI駆動プロジェクト推進基盤 OSS 実装方針書

**Version**: 1.1
**Last Updated**: 2026-05-07
**Status**: Implementation Ready
**License**: Apache License 2.0

---

## 目次

1. [本方針書の位置付け](#本方針書の位置付け)
2. [プロダクトの目的と存在理由](#プロダクトの目的と存在理由)
3. [セグメント別価値マッピング](#セグメント別価値マッピング)
4. [貫く設計原則](#貫く設計原則)
5. [再現性ガバナンス](#再現性ガバナンス)
6. [技術スタック](#技術スタック)
7. [公式エコシステムとの責務境界](#公式エコシステムとの責務境界)
8. [AIコストとセキュリティ方針](#aiコストとセキュリティ方針)
9. [全体アーキテクチャ](#全体アーキテクチャ)
10. [実装フェーズ一覧](#実装フェーズ一覧)
11. [Phase 1: 知識グラフとCLI基盤](#phase-1-知識グラフとcli基盤)
12. [Phase 2: Claude Code統合 (最小構成)](#phase-2-claude-code統合-最小構成)
13. [Phase 3: 差分意味づけと自動化](#phase-3-差分意味づけと自動化)
14. [Phase 4: 手動作業管理とリリース準備](#phase-4-手動作業管理とリリース準備)
15. [Phase 5: オンボーディングと属人化排除](#phase-5-オンボーディングと属人化排除)
16. [Phase 6: Plugin化とアダプタ拡張](#phase-6-plugin化とアダプタ拡張)
17. [Phase 7: 普及フェーズ](#phase-7-普及フェーズ)
18. [メタ層と配布物層の分離](#メタ層と配布物層の分離)
19. [横断的に守るべき禁則事項](#横断的に守るべき禁則事項)
20. [意思決定の記録](#意思決定の記録)

---

## 本方針書の位置付け

本書は、Salesforce AI駆動プロジェクト推進基盤OSSの実装中、**方針や目的がブレないための軸**として機能する。

実装中に判断に迷ったら、本書に戻って以下を確認する。

- その実装は [プロダクトの目的](#プロダクトの目的と存在理由) に沿っているか
- その実装は [貫く設計原則](#貫く設計原則) を破っていないか
- その実装は現在のPhaseの [ゴール](#実装フェーズ一覧) に必要か (スコープクリープしていないか)
- その実装は [横断的に守るべき禁則事項](#横断的に守るべき禁則事項) に抵触していないか

本書は生きたドキュメントとして扱う。設計判断が変わった場合は [意思決定の記録](#意思決定の記録) に追記する。

---

## プロダクトの目的と存在理由

### 最終的に実現したい状態 (北極星)

> **Salesforce に携わる人々の時間と余白を生み出し、ストレスを減らし、生活を豊かにする。** ([README.md](./README.md))

技術的には「人手による管理・運用を極限まで AI で高品質に置き換え、人間が顧客折衝と本質的課題の見極めに時間を使える状態」を作る。
ただし手段（技術的成果）と目的（人の余白とウェルネス）を取り違えてはならない。各 Phase のゴールは **必ず人間側 KPI と紐付ける**。

### 人間側 KPI (各 Phase で必ず測定)

| KPI 名 | 単位 | 目標 (内部検証時) | 計測方法 |
|---|---|---|---|
| 運用タスクの AI 任せ可能比率 | % | 60% 以上 | 1 サイクルの作業ログから手動 / AI 委譲を分類 |
| 新規参画者キャッチアップ所要日数 | 日 | 「人に聞く」運用比 50% 短縮 | `/onboard` 完走時間とヒアリング比較 |
| 1 機能あたりリリース準備時間 | 時間 | 50% 短縮 | リリース前作業の前後比較 |
| 手動作業の見逃し件数 | 件/リリース | 0 を目標 | リリース後インシデント数 |
| 利用者の主観的ストレス指標 | NPS / 5 段階 | +1 改善 | 月次アンケート |

KPI 未達でも実装は進めるが、各 Phase の振り返り (`.agents/knowledge/retrospectives/`) で必ず原因分析を残す。

### 解くべき3つの中核課題

1. **属人化の解消** (大企業 / 中小企業 / ベンダー共通)
   プロジェクト仕様を知らない人でも、AI との対話を通じてスムーズに全体像を理解できる。新規参画者のキャッチアップが「詳しい人に聞く」から「AI に聞く」に置き換わる。

2. **運用タスクの自動化** (大企業 / 中小企業の運用負荷削減)
   ドキュメント整備、差分分類、レビュー観点整理、リリース資材作成、手動作業管理といった運用作業を、AI が構造化して高品質にこなす。

3. **AI 駆動開発の再現性** (ベンダー / SIer の現場間移植性)
   個々のプロジェクトで蓄積した知見が現場間で持ち運べる、共通の基盤と作法を提供する。`.agents/knowledge/` のナレッジ蓄積機構と、決定的処理 + ゴールデンテストによる再現性ガバナンスがその実体。

### 非目的 (やらないこと)

以下は本OSSの目的ではない。混同すると設計がブレる。

- AIにSalesforceのコードを書かせること (既存のコーディングエージェントで十分)
- メタデータの自動デプロイ (sf CLIの領分)
- テスト自動実行 (既存CIの領分)
- 汎用的なドキュメントジェネレータ (Salesforce特化が価値の源泉)
- 静的解析ルールの再実装 (Salesforce Code Analyzer v5 の領分。本OSSは出力 SARIF を入力として活用する)
- ライブ org への直接接続 (sf CLI / Salesforce DX MCP Server / @salesforce/source-deploy-retrieve の領分)

---

## セグメント別価値マッピング

本 OSS は 3 つの顧客セグメントを同時に解く。各 Phase でどのセグメントに何の価値が届くかを以下に明示する。
新機能の追加可否を判定する際は **「3 セグメントのうち最低 1 つに明確な価値があるか」** を必ず確認する。

| Phase | 大企業 (属人化と運用負荷) | 中小企業 (保守運用リソース不足) | ベンダー / SIer (AI 駆動開発の再現性) |
|---|---|---|---|
| 1 (知識グラフ + CLI) | ◎ 巨大組織のメタデータを構造化し人手管理から解放 | ○ 単独でも価値が出る最小導入の基礎 | ◎ プロジェクト間で同じ基盤を持ち回せる土台 |
| 2 (Claude Code 統合) | ◎ 属人化解消の入口。仕様確認の対話化 | ○ 1 名運用でも AI に聞ける | ◎ サブエージェント / コマンドが現場間で再利用可能 |
| 3 (差分意味づけ) | ◎ レビュー負荷削減、リリース事故予防 | ○ 必須ではないがリリース時に効く | ◎ 差分分類の方法論をプロジェクト間で共通化 |
| 4 (手動作業管理 / リリース準備) | ◎ 大規模リリースの抜け漏れ撲滅 | ◎ 専任の運用担当者がいなくても回る | ○ 手動作業レジストリのテンプレート化 |
| 5 (オンボーディング) | ◎ 新規参画者のキャッチアップ短縮 | ◎ 引き継ぎコストの劇的削減 | ◎ persona 別オンボーディングが現場で再利用可能 |
| 6 (Plugin / アダプタ) | ○ 全社展開の容易化 | ◎ **minimal プロファイル**で部分採用が可能に | ◎ npm / Plugin / Vibes IDE 経由で配布可能 |
| 7 (普及) | ○ 標準ツールとして定着 | ○ コミュニティドキュメントを参照 | ◎ OSS 公開で事例蓄積 / ベンダー間共通言語化 |

(◎ = 主要価値、○ = 副次価値)

### 中小企業向け「最小導入パス」

中小企業は Phase 1〜7 の全てを採用しなくても価値が出るように、Phase 6 で **3 つの導入プロファイル** を提供する。

| プロファイル | 含まれるもの | 想定対象 |
|---|---|---|
| minimal | Phase 1 (知識グラフ + render) のみ | リソース最小、まず構造化したい中小企業 |
| standard | Phase 1〜3 + 5 | 通常運用の中小企業 / 中堅 |
| full | Phase 1〜6 全て | 大企業 / ベンダー本格運用 |

詳細は [Phase 6](#phase-6-plugin化とアダプタ拡張) 参照。

---

## 貫く設計原則

以下の原則は全Phaseを通じて守る。実装中に迷ったらここに戻る。

### 原則1: 処理を3層に厳格に分ける

| 層 | 担当 | 例 |
|---|---|---|
| 決定的処理層 | CLI (TypeScript) | XMLパース、グラフ構築、差分検出、テンプレート描画、スキーマ検証 |
| AIエージェント処理層 | Claude Code subagent | 意味分類、自然文サマリ、影響推測、レビュー観点提示 |
| 人手補完層 | 人間のみ | 業務意図、例外運用、顧客固有ルール、承認 |

**判断基準**: 同じ入力に対して同じ出力が必要なら決定的処理層。曖昧さや判断が必要ならAI層。組織固有の文脈や責任が必要なら人手層。

### 原則2: 正本は実装側、中間正本は知識グラフ

- Layer 1 正本: `force-app/` (Salesforce DXソース) + Git
- Layer 2 中間正本: `.sfai/graph.sqlite` (正本から決定的に再生成可能)
- Layer 3 派生物: `docs/generated/` 配下のMarkdown (知識グラフから描画)

**Markdownは派生物。決してMarkdownを手編集してそれを正本扱いしてはいけない。**

### 原則3: AIに生データを読ませない

Salesforceメタデータ(XML)を直接AIに読ませない。必ず知識グラフを経由する。

- 理由1: トークン効率 (XMLは冗長、SQLクエリは簡潔)
- 理由2: 再現性 (同じ質問に対して同じクエリ結果)
- 理由3: 速度 (SQLiteは数ミリ秒、AIパースは数秒)

### 原則4: 3種類のブロックで文書を構造化

全テンプレートは以下の3種のブロックで構成する。AI再生成時に人の追記を壊さないための仕組み。

```markdown
<!-- DETERMINISTIC_START --> 
決定的処理層が生成。手編集禁止。
<!-- DETERMINISTIC_END -->

<!-- AI_MANAGED_START -->
AI層が生成。再生成で上書きされる。
<!-- AI_MANAGED_END -->

<!-- HUMAN_MANAGED_START -->
人手補完層。AI再生成で保護される。
<!-- HUMAN_MANAGED_END -->
```

### 原則5: CLAUDE.mdは軽量に保つ

CLAUDE.mdは「プロジェクトの憲法」。詳細は書かず、**骨子と参照先のみ**を書く。

- 目安: 10〜15KB以内
- 書くべき: CLIコマンド一覧、知識グラフのスキーマ概要、3層分離の原則、参照先パス
- 書かざるべき: 個別オブジェクトの仕様、業務ルールの詳細、長大な手順書

### 原則6: Subagent化は「コンテキスト隔離が必要なときだけ」

Subagentは便利だが、乱用するとメインエージェントから情報が見えなくなり、かえって不自由になる。

- Subagent化する: 大量ファイル走査、深い依存解析、長時間処理
- Subagent化しない: 小さな文書補完、会話的タスク、軽い整形

### 原則7: 決定的処理はhooksで強制する

AIに「忘れずに検証してね」と頼むのは脆い。Claude Code hooksで決定的処理を強制注入する。

- `PostToolUse(Edit force-app/**)` → 知識グラフ増分更新
- `PostToolUse(Edit docs/generated/**)` → スキーマ検証

### 原則8: Salesforce特化を優先、汎用化は後回し

本OSSはSalesforce特化として実装する。adapterパターンによる抽象化は、実例が2つ以上揃ってから検討する。

例外: 入力ソース層（`force-app/` ローカル vs Salesforce DX MCP Server 経由）は **Phase 2 から共通インターフェースを切り、Phase 6 でアダプタ実装する**。これは「Salesforce 公式エコシステムとの相互運用」と「`force-app/` を持たない調査ユースケースへの対応」のために必要。詳細は [DX MCP アダプタ層 ADR](./.agents/knowledge/decisions/2026-05-07-dx-mcp-adapter-pattern.md) 参照。

---

## 再現性ガバナンス

本 OSS の根幹は **「同じ入力に対して同じ出力を保証する」** ことにある。AI 出力は temperature=0 でも完全一致しない現実を前提に、以下の 5 層で再現性を担保する。

### 層1: プロンプトをコードとして扱う

- すべての subagent / slash command のシステムプロンプトは `prompts/` に配置し Git で版管理
- プロンプトファイルの SHA-256 ハッシュを成果物 (`change_summary` 等) のメタデータに埋め込む
- プロンプト変更は **必ず ADR を伴う** ([`.agents/knowledge/decisions/`](./.agents/knowledge/decisions/))

### 層2: 各フィールドに `source` メタデータ

すべての AI 関与スキーマは、フィールドごとに `source: deterministic | ai | human` を持つ。詳細 ADR: [source 列必須化](./.agents/knowledge/decisions/2026-05-07-source-column-three-layer-boundary.md)

```yaml
business_impact_hint:
  value: "顧客向け請求書フォーマットの変更により..."
  source: ai           # AI 推測
  prompt_hash: "sha256:abc123..."  # プロンプトのバージョン
  model: "claude-sonnet-4-6"
  temperature: 0
```

ajv バリデーションで `source` 未指定を弾く。

### 層3: ゴールデンテスト (`tests/golden/`)

- 決定的処理層 (`source: deterministic`) のフィールドは、入力と期待出力をハッシュ比較で完全一致テスト
- AI 層 (`source: ai`) のフィールドは、入力サンプル × 期待出力構造（JSON Schema 適合）+ キーフレーズの含有チェック
- ゴールデンセットは **Phase 1 から育てる**（CLI のテストとして）

### 層4: AI 出力の一致率 CI

- temperature=0 / 同一 model / 同一プロンプトハッシュで同一入力を **N 回再実行** し、JSON Schema 適合率と完全一致率を計測
- 完全一致率の目標: **80% 以上**（Phase 3 で初期目標、Phase 7 で 95%）
- 一致率が閾値を下回ったらビルド失敗

### 層5: 決定的計算と AI 推測の境界をスキーマで強制

- `scope_size` のような「行数 / ファイル数から計算可能」なフィールドは決定的処理層で計算（`source: deterministic`）
- `business_impact_hint` のような業務文脈フィールドは AI 層（`source: ai`）
- どちらに分類するかの判断ルールを Phase 3 で明文化（[Code Analyzer SARIF 統合 ADR](./.agents/knowledge/decisions/2026-05-07-code-analyzer-sarif-integration.md) も参照）

### 結果として得られるもの

- **再現性検証可能**: change_summary をハッシュで比較すれば「実装が変わったのか / AI 揺らぎなのか / プロンプトが変わったのか」が一意に特定できる
- **ベンダー間移植性**: ゴールデンセットとプロンプトハッシュをエクスポートすれば、別プロジェクトで同じ品質を再現できる（コンセプト 3「AI 駆動開発の再現性」の実体）
- **AI コスト管理**: 一致率 CI が劣化したら高コストモデルに退避、改善したら廉価モデルへ自動切替

---

## 技術スタック

| 分類 | 技術 | 理由 |
|---|---|---|
| CLI言語 | TypeScript + Node.js 20+ | Salesforce DXと揃う / 起動速度 / npm配布 |
| Salesforceメタデータ処理 | @salesforce/source-deploy-retrieve (peer) | 公式SDK、仕様変化追従 |
| Salesforce CLI | @salesforce/cli (peerDependency) | 公式 CLI、scratch org / deploy / retrieve |
| 知識グラフDB | SQLite (better-sqlite3) | 高速、ゼロ設定、ファイル一個で完結 |
| テンプレートエンジン | **eta** (確定) | 軽量、TS 親和、async サポート ([ADR](./.agents/knowledge/decisions/2026-05-07-template-engine-eta.md)) |
| スキーマ定義 | JSON Schema (ajv) | 検証が決定的、`source` 列の強制 |
| 主要AI基盤 | Claude Code | subagent/hooks/skills/plugin が揃う |
| 副次AI基盤 | Google Antigravity (Phase 6 で互換確認) | Claude Sonnet/Opus互換 |
| 静的解析 (連携) | Salesforce Code Analyzer v5 (SARIF 入力) | 公式、PMD/ESLint/Flow Scanner 統合 |
| ライブ org アクセス (Phase 6 アダプタ) | Salesforce DX MCP Server (Beta) | 公式、60+ ツール |
| 配布 | npm + Claude Code Plugin | 標準的 |
| テスト | vitest + ゴールデンテスト基盤 | 高速、TypeScript親和性 |
| Linter/Formatter | Biome | 統合ツール、高速 |
| ライセンス | **Apache License 2.0** (確定) | 特許条項あり、企業利用親和 ([ADR](./.agents/knowledge/decisions/2026-05-07-license-apache-2.0.md)) |

---

## 公式エコシステムとの責務境界

本 OSS は Salesforce 公式・準公式ツールと **重複せず補完する** 設計を貫く。各ツールへのスタンスを以下に明示する。

### ハード依存 (前提とする)

| ツール | 提供主体 | 本 OSS での扱い |
|---|---|---|
| `@salesforce/source-deploy-retrieve` | Salesforce 公式 (BSD-3) | グラフビルダーの中核 SDK。registry を直接参照しメタデータ型網羅性を担保 |
| `@salesforce/cli` (sf CLI) | Salesforce 公式 (BSD-3) | peerDependency 宣言。`sfai init` で存在チェック |

### 連携 (オプション / アダプタ経由 / 出力を入力に)

| ツール | 提供主体 | 連携方式 | 該当 Phase |
|---|---|---|---|
| Salesforce DX MCP Server (Beta) | Salesforce 公式 (Apache 2.0) | `adapters/dx-mcp/` で `sfai init --source dx-mcp` を実装。ライブ org アクセスを担当 | Phase 2 で IF, Phase 6 で実装 |
| Salesforce Code Analyzer v5 | Salesforce 公式 (BSD-3) | SARIF 出力を `sfai diff --include-static-analysis` で読み込み、差分分類器の入力に | Phase 3 |
| ApexGuru (DX MCP scale-products) | Salesforce 公式 | logic-classifier から呼び出し、Apex 性能観点を委譲 | Phase 4 以降 |
| Lightning Flow Scanner | コミュニティ OSS (MIT) | Code Analyzer v5 経由で間接利用 | Phase 3 |

### 参照のみ (推奨環境として文書化、依存なし)

- VS Code Salesforce Extension Pack — 推奨 IDE 環境として README に記載
- LWC Jest / UTAM / GitHub Actions — 利用者が自由に選択
- Agentforce DX / Vibes IDE — Phase 6 で Vibes IDE からの `sfai` 呼び出し動作確認

### 依存禁忌 (禁則 11 として後述)

- **JSforce による直接 org 接続** — Layer 1 (`force-app/` + Git) を正本とする原則を破る
- **SFDX Hardis** — ドキュメント生成と CI/CD の一部機能が重複、AGPL ライセンスの伝播リスク
- **Provar** — 商用ライセンスロックイン

### 本 OSS の差別化ポイント (公式に存在しないもの)

1. **知識グラフによる依存解析** — DX MCP / SDR には依存解析機能なし
2. **差分の業務的意味分類 (7 カテゴリ) と手動作業レジストリ**
3. **HUMAN_MANAGED ブロック保護による AI 再生成の安全性**
4. **persona 別オンボーディング** (`/onboard --role new_joiner | reviewer | release-manager | customer-facing`)
5. **再現性ガバナンス層** (プロンプトハッシュ + ゴールデンテスト + 一致率 CI + `source` 列)

---

## AIコストとセキュリティ方針

### モデル選定ポリシー

| タスク種別 | デフォルトモデル | 退避先 (廉価) | 退避先 (高品質) |
|---|---|---|---|
| 軽量応答 / 短文整形 | Haiku | (なし) | Sonnet |
| 差分分類 / 主要 subagent | Sonnet | Haiku (一致率 CI が 90% 以上を維持できる場合) | Opus |
| 設計判断 / 重要レビュー | Opus | Sonnet (テスト目的のみ) | (最上位) |

退避は **一致率 CI と業務インパクト** で自動判定する（Phase 3 で実装）。

### コスト上限と監視

- **月次トークン予算**: プロジェクトごとに `.sfai/budget.yaml` で宣言。超過時はビルド失敗 (CI ブロック)
- **使用統計**: `sfai metrics --period month` で集計、`docs/metrics/` に履歴を蓄積
- **コスト爆発の典型ワナ**: subagent 並列実行（Phase 3 で 6 並列）、大型差分 (1000 ファイル超) → サンプリング方針を Phase 3 で実装

### セキュリティ方針

| 項目 | 方針 | 該当 Phase |
|---|---|---|
| メタデータ機密性分類 | 顧客名 / メール / 内部 ID を検出する正規表現セットを `.sfai/secrets-rules.yaml` に定義 | Phase 1 |
| マスキング | AI 送信前に分類済みフィールドを伏せ字化。マスキング前後をログに残し検証可能に | Phase 1 |
| ローカルストレージ暗号化 | `.sfai/graph.sqlite` は OS キーチェーン連携 (option) で暗号化。デフォルトは平文 + gitignore | Phase 6 |
| 認証情報 | sf CLI / DX MCP の認証は本 OSS で扱わない (公式に委譲)。本 OSS は **org に直接接続しない** ことが第一の防御 | 全 Phase |
| OSS 混入禁止 | 顧客名 / 顧客固有ロジック / 顧客データはサンプル / テスト / ドキュメントに含めない (禁則 8) | 全 Phase |
| PII 検出 | オンボーディング対話ログから FAQ を抽出する Phase 5 で PII フィルタを必須化 | Phase 5 |
| 脆弱性スキャン | npm audit / Snyk / GitHub Dependabot を CI に組み込み | Phase 6 |

### インシデント対応

- 機密情報を AI に送ってしまった疑いがある場合: (1) 即座に該当セッションを記録 (2) 利用者に通知 (3) `.agents/knowledge/pitfalls/` に永続化
- 本 OSS の脆弱性発見時: `SECURITY.md` に従い 90 日 disclosure ポリシー (Phase 6 で整備)

---

## 全体アーキテクチャ

```
┌─────────────────────────────────────────────────┐
│ Layer 5: 人間                                    │
│  - 業務意図、顧客折衝、承認                        │
├─────────────────────────────────────────────────┤
│ Layer 4: AIエージェント層                          │
│  - Claude Code (主)                             │
│    - CLAUDE.md / subagents / commands / hooks   │
│  - Antigravity (副)                             │
├─────────────────────────────────────────────────┤
│ Layer 3: sfai CLI (決定的処理層)                  │
│  - TypeScript / Node.js                         │
│  - graph / render / diff / validate / release    │
├─────────────────────────────────────────────────┤
│ Layer 2: 中間正本 (知識グラフ)                     │
│  - .sfai/graph.sqlite                           │
├─────────────────────────────────────────────────┤
│ Layer 1: 正本                                    │
│  - force-app/ (sfdx source)                     │
│  - Git history                                  │
└─────────────────────────────────────────────────┘
```

データは下から上に流れる。上位層が下位層を直接変更することは禁じる (例: AIがSQLiteを直接書くのは禁止、必ずCLI経由)。

---

## 実装フェーズ一覧 / リリース計画

> **2026-05-10 改訂**: 元の Phase 1〜7 計画は 2026-05-08 〜 05-09 に Phase 7 配下で 9 個の派生 Phase (8〜15) を生む結果となった。本セクションは [Phase スコープ規律 ADR (2026-05-10)](./.agents/knowledge/decisions/2026-05-10-scope-discipline-and-phase-restructure.md) を踏まえて **リリース計画ベース** に整流化されている。
> 過去の Phase 1〜15 ADR は履歴として `.agents/knowledge/decisions/` に保全されている (改竄しない)。**今後の正本は本セクションのリリース計画**。

### リリース計画 (3 段階ゴールに対応)

| リリース | 段階 | テーマ | 状態 | 旧 Phase 対応 |
|---|---|---|---|---|
| v0.1.0 | 内部検証 (基盤) | 知識グラフ + CLI + Claude統合 + 差分意味づけ + 手動作業管理 + オンボーディング + Plugin化 | ✅ リリース済 (2026-05-08) | 旧 Phase 1〜6 |
| v0.2.0 | 内部検証 (拡充) | ドキュメント完全化 (21 メタデータ種対応) + 処理フロー可視化 + AI 文面生成基盤 (`/sfai-explain`) | ✅ リリース済 (2026-05-10) | 旧 Phase 7〜15 を統合 |
| **v0.3.0** | **内部検証 (実証)** | **現参画プロジェクトでの実利用 + KPI 計測 + 既知 pitfalls の解消** | **次に着手** | 旧 Phase 7「普及」前段に再配置 |
| v0.4.0+ | 社内展開 | 社内他プロジェクトへの展開、フィードバック反映 | 将来 | — |
| v1.0.0+ | 社外展開 | OSS 公開、コンサル導入、コミュニティ運営 | 将来 | 旧 Phase 7「普及」後段 |

### リリース粒度の判定基準

新しい Phase を起こすかどうかは [`AGENTS.md` § 3 Phase スコープ規律](./AGENTS.md#3-phase-スコープ規律) の閾値に従う。要点のみ:

- Phase 内で見つかった課題は **原則 Phase 内で対処** (Phase が長くなることを許容)
- 新 Phase は「現 Phase 北極星から明確に外れる」+「人間オーナー承認」の **両方** を満たすときだけ
- 検証だけで Phase を立てない (検証は元 Phase の DoD に含める)
- リリース粒度のテーマを超えそうになったら、それは新リリース (v0.(x+1).0) のサイン

### 内部検証完了の Definition of Done

「内部検証完了 = v1.0.0 候補入り」と判断するための明示的な完了条件:

| 完了条件 | 閾値 | 計測方法 |
|---|---|---|
| 現参画プロジェクトで `sfai sync` を週次運用 | 4 週連続 | 運用ログ |
| 利用者主観: 「資料更新が不要、ソースが正本」と実感 | 5 段階で 4 以上 | 振り返りヒアリング |
| 運用タスク AI 任せ可能比率 | 60% 以上 | 1 サイクルの作業ログ分類 |
| 1 機能あたりリリース準備時間 | 50% 短縮 | リリース前作業の前後比較 |
| 手動作業見逃し件数 | 0 / リリース | リリース後インシデント数 |

**5 項目中 3 項目以上で達成** が DoD。これを満たすまでは技術拡張ではなく実利用に注力する。

### 旧 Phase 1〜7 詳細セクションの位置付け

以下「Phase 1〜6」の詳細セクションは v0.1.0 で実装された機能の **歴史的記述** として保全する。「Phase 7: 普及フェーズ」セクションは 2026-05-10 改訂で **v0.3.0 内部検証実証 + v0.4.0+ 普及** に再構成された (該当セクション参照)。

### ナレッジ蓄積層の運用開始タイミング

`.agents/knowledge/` は **v0.1.0 開発開始時 (旧 Phase 2 相当) から本格運用** を継続している。各 Phase / 各サイクルの振り返りは `.agents/knowledge/retrospectives/` に必ず残す。

---

## Phase 1: 知識グラフとCLI基盤

### 目的

Salesforceメタデータを中間正本としての知識グラフに変換し、そこからMarkdownを決定的に描画できる状態を作る。本OSS全体の土台となる層。

### 概要

`sfai` CLIを実装する。`@salesforce/source-deploy-retrieve` で `force-app/` を読み、SQLiteに構造化して格納する。格納されたグラフからMarkdownテンプレートを経由して文書を描画する。

### ゴール (完了条件)

- `sfai graph build` が `force-app/` を読み `.sfai/graph.sqlite` を生成する
- `sfai graph build --incremental` が差分だけを更新する
- `sfai graph schema` が現行スキーマ定義を出力する
- `sfai render system-index` が `docs/generated/system-index.md` を描画する
- `sfai render objects` が各オブジェクトのMarkdownを `docs/generated/objects/` に描画する
- スキーマがJSON Schemaとして定義され、ajvで検証できる
- 単体テスト + ゴールデンテストが **80%以上** カバー (グローバル基準と統一)
- **HUMAN_MANAGED ブロックのマージアルゴリズム ADR** が `.agents/knowledge/decisions/` に存在する
- **メタデータ機密性分類とマスキング規約** が `.sfai/secrets-rules.yaml` (テンプレート) として整備されている
- 入力ソース層が共通インターフェース (`fetchMetadata`) を持ち、`LocalSourceAdapter` 実装が完了 (Phase 6 の DX MCP アダプタを後付けできる構造)

### 必要なポイント

**知識グラフのスキーマ設計**

最低限のエンティティ:
- `objects` (SObject定義)
- `fields` (フィールド定義、オブジェクトに紐づく)
- `validation_rules`
- `flows` (FlowとProcess Builderを統合扱い)
- `apex_classes`
- `apex_triggers`
- `permission_sets`
- `profiles`
- `dependencies` (エンティティ間の参照関係、多対多)
- `tags` (domain/feature/release用の論理タグ)

**CLIコマンド体系**

```
sfai graph build [--incremental] [--source local|dx-mcp]   # 入力ソースは Phase 6 で dx-mcp 追加
sfai graph query <sql>
sfai graph schema [--format json|markdown]
sfai render <target> [--output <path>]
sfai validate <target>
sfai metrics [--period day|week|month]                       # AI コスト計測 (Phase 2 から有効)
sfai version
```

**テンプレート方針**

- テンプレート言語は **eta に確定** ([ADR](./.agents/knowledge/decisions/2026-05-07-template-engine-eta.md))
- 3種ブロック (DETERMINISTIC/AI_MANAGED/HUMAN_MANAGED) はテンプレート側で挿入 (eta ヘルパーで実装)
- 再描画時、HUMAN_MANAGEDブロックの内容は保持する必要がある (マージロジック ADR を必須成果物として作る)

**HUMAN_MANAGED マージロジック (Phase 1 必須成果物)**

以下のテストケースを golden test 化し、ADR を `.agents/knowledge/decisions/` に必ず作成する。

| ケース | 期待挙動 |
|---|---|
| 既存ファイルなし | テンプレートをそのまま書き出し |
| HUMAN_MANAGED ブロックのみ存在 | DETERMINISTIC / AI_MANAGED は新規描画、HUMAN_MANAGED は保持 |
| HUMAN_MANAGED ブロックが消失 | 警告ログ、空ブロックを再挿入 |
| エンティティリネーム | 旧ファイルから HUMAN_MANAGED を抽出し新ファイルへ移植、`HUMAN_MIGRATED_FROM:` メタコメントを付与 |
| エンティティ削除 | `docs/generated/_archive/` に移動、HUMAN_MANAGED は archive 側で保全 |
| マーカー欠損・破損 | エラー停止、人手介入を要求 |

### 要点

- **パフォーマンス最優先**: better-sqlite3 のプリペアドステートメントを活用。大規模組織(5000+オブジェクト)でも10秒以内にフルビルド完了を目標
- **冪等性**: 同じ入力に対して必ず同じ出力。ハッシュ比較でテスト
- **増分ビルド**: ファイル単位のmtimeとハッシュで変更検出
- **HUMAN_MANAGEDブロックの保全**: 描画時、既存ファイルがあれば HUMAN_MANAGED ブロックだけ抽出してマージする

### 懸念事項・注意事項

- **Salesforceメタデータのバリエーションは多い**: オブジェクト、フィールド、Flow、Apexだけでも数十種類のサブタイプがある。Phase 1では**標準的な形のみ対応**し、例外形はPhase 7以降で拡充する方針を明記する
- **Flowのパースは特に複雑**: サブフローやループ、複雑な条件分岐は Phase 1 ではメタデータとして取り込むのみにとどめ、意味解釈は Phase 3 でAI側に任せる
- **オーバーエンジニアリング警戒**: この段階でグラフDBやNeo4jを使いたくなるが禁止。SQLiteで十分
- **テンプレートの過剰装飾禁止**: Phase 1のMarkdownは機能最小。見た目の改善はPhase 7
- **権限系メタデータ (Permission Set / Profile) の工数過小見積りリスク**: 対応が重い場合は **Phase 1a (コアエンティティ) / Phase 1b (権限系)** に分割する選択肢を残す。1a で先に Phase 2 へ進めても良い
- **機密性検出の漏れ**: `secrets-rules.yaml` のデフォルト正規表現で網羅できないケースがある。Phase 1 終了時に既知の取りこぼしパターンを `.agents/knowledge/pitfalls/` へ記録する

### このPhaseで作らないもの

- AIエージェント関連 (Phase 2以降)
- 差分処理 (Phase 3)
- リリース関連 (Phase 4)
- 複数プロジェクト対応 (将来検討)

---

## Phase 2: Claude Code統合 (最小構成)

### 目的

Phase 1で作ったCLIと知識グラフを、Claude Codeから使える状態にする。最小限の subagent と slash command を整備し、AIとの対話でプロジェクト理解が進む原型を作る。

### 概要

`CLAUDE.md` を整備し、基本的な slash command と subagent を配置する。この段階では複雑な自動化はせず、**AIが知識グラフにクエリを発行して対話的に応答する**状態を作る。

### ゴール (完了条件)

- `CLAUDE.md` が15KB以内で整備されている (本リポジトリでは v1.0 で確立済み)
- `/onboard` コマンドでプロジェクト全体像の提示が始まる
- `/impact <object>` で依存関係を回答する
- subagent 3種 (graph-querier, object-documenter, onboarding-guide) が動く
- hooks の最小セット (`PostToolUse(force-app/**)` → graph rebuild) が動く (Node 起動を含む実時間 **2 秒以内** を目標、Phase 7 で daemon 化検討)
- 入力ソース層の共通インターフェースが完成し、`LocalSourceAdapter` 経由で動作 (Phase 6 の DX MCP アダプタ後付け前提)
- `sfai metrics` で AI 利用トークン数とコスト概算が出る
- 既存のSalesforceサンプルプロジェクトで動作確認済み
- **検証ゲート**: 現役プロジェクトで 1 名が `/onboard` を完走し、定性フィードバックを `.agents/knowledge/retrospectives/` に記録
- `.agents/knowledge/` の運用が本格開始 (decisions / pitfalls / wins / improvements / retrospectives の追記が回り始めている)

### 必要なポイント

**CLAUDE.md の構造**

```markdown
# Project: <Project Name>

## このプロジェクトの読み方
1. 全体像は `docs/generated/system-index.md` を読む
2. 個別オブジェクトは `.sfai/graph.sqlite` にクエリする
3. 業務文脈は `docs/human/business-notes/` を読む

## 知識グラフのスキーマ (概要)
- objects, fields, flows, apex_classes, dependencies テーブルがある
- 詳細は `sfai graph schema` で確認

## 使えるCLIコマンド
- sfai graph query <sql>
- sfai render <target>
- sfai diff
(詳細は `sfai --help`)

## 3層分離の原則
- force-app/ は正本 (AIが直接編集しない)
- docs/generated/ は決定的生成 (手編集しない)
- docs/human/ は人手補完領域 (AIが上書きしない)

## 禁則
- 知識グラフを直接更新しない。必ず sfai 経由。
- CLAUDE.mdを肥大化させない。
```

**必要な subagent**

| Subagent名 | 役割 | tools制限 |
|---|---|---|
| graph-querier | SQLクエリで構造情報を取得 | Bash(sfai graph query) |
| object-documenter | 単一オブジェクトの説明を生成 | Read, Bash(sfai) |
| onboarding-guide | 段階的プロジェクト紹介 | Read, Task |

**必要な slash command**

- `/onboard` - プロジェクト理解の出発点
- `/impact <entity>` - 依存関係の確認
- `/explain <entity>` - エンティティの詳細説明

**必要な hooks**

```json
{
  "PostToolUse": [
    {
      "matcher": "Edit|Write",
      "pathMatcher": "force-app/**",
      "hooks": [{"type": "command", "command": "sfai graph build --incremental --quiet"}]
    },
    {
      "matcher": "Edit|Write",
      "pathMatcher": "docs/generated/**",
      "hooks": [{"type": "command", "command": "sfai validate --target $file"}]
    }
  ]
}
```

### 要点

- **軽量が命**: この段階でsubagent, commandを増やしすぎない。3+3の6つで開始
- **知識グラフ経由を徹底**: AIが直接XMLを読むようなフローを許容しない
- **CLAUDE.md肥大化の監視**: 1KBでも増やす時は正当性を確認
- **hooksは慎重に**: `sfai graph build --incremental --quiet` の **wall-clock 2 秒以内** を目標。Node CLI cold-start で 600ms ほど消費するため 500ms 目標は非現実的だった (2026-05-07 計測)。大規模 org では hooks 無効化を許容
- **DX MCP アダプタを意識した抽象化**: subagent からは入力ソース層に IF 経由でアクセスし、`force-app/` 直読み込みを禁止

### 懸念事項・注意事項

- **subagentが主エージェントからコンテキストを隠す問題**: `graph-querier` は便利だが、主エージェントがスキーマを知らない状態になると逆に非効率。CLAUDE.mdにスキーマ概要を載せて主エージェントも理解している状態にしておく
- **Claude Code の仕様変更リスク**: subagentやhooksの仕様は流動的。`plugin.json` などの設定ファイルはバージョンを固定し、互換性テストを怠らない
- **hooksの無限ループ**: `PostToolUse(force-app/**)` → graph書き換え → それが force-app/ に影響、というループを起こさない。CLIは `force-app/` を読むだけで書かないこと
- **トークンコスト**: subagent乱用はトークンコストを押し上げる。使用統計をPhase 2の終わりに一度測定する

### このPhaseで作らないもの

- 差分の意味分類 (Phase 3)
- 手動作業抽出 (Phase 4)
- オンボーディングの完全版 (Phase 5)
- Plugin化 (Phase 6)

---

## Phase 3: 差分意味づけと自動化

### 目的

Git差分を業務的な意味差分に変換し、レビューとリリースに繋げる。本OSSが「日常運用で使える」と言える最小ラインをここで達成する。

### 概要

`sfai diff` で決定的な差分を抽出し、subagentが意味分類する。並列実行でパフォーマンスを稼ぎ、変更サマリを自動生成する。

### ゴール (完了条件)

- `sfai diff --from <ref> --to <ref> --json` が差分JSONを出力する
- 差分は 7分類 (データモデル / 自動化 / 権限 / UI / ロジック / 運用影響 / 手動対応) に分けられる
- `/classify-diff` が並列subagent で分類を実行する
- `docs/ai-augmented/change-summaries/<date>.md` が自動生成される
- 変更サマリは JSON Schema で検証され、**全フィールドに `source` メタデータ** が付与されている ([ADR](./.agents/knowledge/decisions/2026-05-07-source-column-three-layer-boundary.md))
- 一致率 CI が **80% 以上** で通る (温度 0、同一プロンプトハッシュ)
- `sfai diff --include-static-analysis <sarif>` で **Code Analyzer v5 の SARIF を入力** に取れる ([ADR](./.agents/knowledge/decisions/2026-05-07-code-analyzer-sarif-integration.md))
- 大型差分 (1000 ファイル超) のサンプリング方針が実装されている
- PRテンプレートから変更サマリが参照される
- **検証ゲート**: 1 つの実 PR で `/classify-diff` を実運用し、人手照合で分類精度を計測

### 必要なポイント

**差分の JSON スキーマ (source 列必須)**

各フィールドは `{ value, source, prompt_hash?, model?, temperature? }` の wrapper 構造を取る。`source` は `deterministic | ai | human` のいずれか。詳細は [再現性ガバナンス](#再現性ガバナンス) と [source 列必須化 ADR](./.agents/knowledge/decisions/2026-05-07-source-column-three-layer-boundary.md) 参照。

```yaml
change_summary:
  id: { value: string, source: deterministic }
  created_at: { value: datetime, source: deterministic }
  from_ref: { value: string, source: deterministic }
  to_ref: { value: string, source: deterministic }
  static_analysis_findings:                          # Code Analyzer v5 SARIF (任意)
    value: SarifResult[]
    source: deterministic
  categories:
    - type: { value: enum[data_model, automation, permission, ui, logic, operational, manual], source: deterministic }
      changes:
        - entity: { value: string, source: deterministic }
          change_kind: { value: enum[added, modified, removed, renamed], source: deterministic }
          scope_size: { value: enum[small, medium, large], source: deterministic }   # 行数とファイル数から計算
          affected_entities: { value: string[], source: deterministic }              # グラフ依存解析
          review_points: { value: string[], source: ai, prompt_hash, model, temperature }
          manual_steps_required: { value: boolean, source: ai, prompt_hash, model, temperature }
          business_impact_hint: { value: string, source: ai, prompt_hash, model, temperature }
  human_annotations:  # HUMAN_MANAGED部分
    business_context: { value: string, source: human }
    customer_communication_needed: { value: boolean, source: human }
```

**subagent の並列設計**

| Subagent名 | 担当分類 | 並列可能 |
|---|---|---|
| data-model-classifier | データモデル差分 | ✓ |
| automation-classifier | 自動化差分 (Flow, Apex Trigger) | ✓ |
| permission-classifier | 権限差分 | ✓ |
| ui-classifier | UI差分 (Layout, LWC) | ✓ |
| logic-classifier | Apexロジック差分 | ✓ |
| summary-integrator | 上記結果を統合 | 最後に実行 |

**slash command 追加分**

- `/classify-diff [--from <ref>] [--to <ref>]`
- `/change-summary` - 直近の差分サマリを生成

### 要点

- **並列の勝ち筋**: 分類器を並列で起動することでレイテンシを削減。6並列で大型差分でも60秒以内目標
- **決定的スコア + AI解釈のハイブリッド**: 「行数」「影響ファイル数」は決定的に計算、「業務影響」はAI推測
- **手動作業の検出は慎重に**: ピックリスト値追加など手動対応が必要な変更は見逃すと事故る。ルールベースで一次検出し、AIが二次確認
- **レビュー観点の定型化**: 過剰な自由記述を避け、チェックリスト形式で提示

### 懸念事項・注意事項

- **AIによる分類の再現性**: temperature=0でも完全一致は保証されない。JSON Schemaで構造を固定し、自由記述部分は短く保つ
- **大型差分の扱い**: 1000ファイル超のマージなどは分類コストが爆発する。上限を設け、超えたらサンプリング方針
- **誤分類の検出**: 過去事例から学ぶ仕組みはPhase 5以降。Phase 3ではHUMAN_MANAGEDで人間が修正し、その修正が再生成で壊れないことを担保
- **Flow差分の難しさ**: FlowのXMLはノード移動だけで差分が発生することがある。意味差分に昇格させるためのノーマライズが必要

### このPhaseで作らないもの

- 手動作業レジストリ (Phase 4)
- リリース資材生成 (Phase 4)
- 過去事例学習機構 (将来)

---

## Phase 4: 手動作業管理とリリース準備

### 目的

リリース事故の最大要因である「手動作業の抜け」を構造的に防ぎ、リリース資材を自動生成できる状態を作る。

### 概要

手動作業レジストリをスキーマ化し、差分から自動抽出する。リリース時に資材一覧、Go/No-Go判断材料、ロールバック条件を含むリリースドキュメントを生成する。

### ゴール (完了条件)

- 手動作業がJSON Schemaで定義される (`source` 列必須)
- Phase 3の差分分類から手動作業が自動抽出される
- `/release-prep --from <tag> --to HEAD` でリリース資材が生成される
- `docs/releases/<version>.md` に以下が含まれる:
  - リリース対象一覧
  - 手動作業チェックリスト
  - 事前確認・事後確認項目
  - Go/No-Go判断材料
  - ロールバック手順のドラフト
  - 顧客周知文のドラフト
- 手動作業レジストリが `ops/registry/manual-steps-registry.md` に集約される
- ApexGuru (DX MCP scale-products toolset 経由) の性能観点が logic-classifier から呼び出せる (オプション)
- **検証ゲート**: 1 リリースで `/release-prep` を実運用し、手動作業見逃しゼロを達成

### 必要なポイント

**手動作業のスキーマ**

```yaml
manual_step:
  id: string
  title: string
  category: enum[pre_release, during_release, post_release]
  related_change: string  # change_summary のID
  target: string  # 対象機能/オブジェクト
  procedure: string[]  # 手順
  timing: string  # 実施タイミング
  executor_role: string  # 実施者のロール
  verification: string  # 確認方法
  estimated_duration_min: integer
  reversible: boolean
  notes: string
```

**自動抽出のルール例**

- ピックリスト値の追加 → リリース後にレコード更新が必要か確認
- 必須フィールドの追加 → 既存レコードのデータ補完が必要
- 権限セットの新規追加 → ユーザーへの割り当てが必要
- 名前空間変更 → 外部連携側の対応要否を確認

**subagent 追加分**

| Subagent名 | 役割 |
|---|---|
| manual-step-extractor | 差分から手動作業を抽出 |
| release-composer | リリースドキュメントを組み立て |
| rollback-drafter | ロールバック手順のドラフト作成 |

**slash command 追加分**

- `/release-prep [--from <tag>] [--to <ref>]`
- `/manual-steps [--release <version>]`

### 要点

- **見逃しより過剰検出が安全**: 手動作業は「漏れる」方が事故。過剰に検出してレビューで削る方針
- **役割の分離**: `manual-step-extractor` は抽出だけ、`release-composer` は組み立てだけ、と責務を明確化
- **リリースドキュメントは人間の確認前提**: AI生成部分は AI_MANAGED ブロックにし、人間の承認は HUMAN_MANAGED ブロックで

### 懸念事項・注意事項

- **ロールバック手順の自動生成は慎重に**: 間違ったロールバック手順は事故を拡大する。Phase 4では「ドラフトを提示、人間が必ず確認」の運用を徹底。完全自動化はしない
- **顧客周知文のハルシネーション**: AI生成の顧客向け文章は事実誤認リスクがある。テンプレート埋め込み方式にして自由生成を抑制
- **リリースバージョニングの流派**: プロジェクトごとに命名規則が異なる。設定可能にする
- **過去リリースとの整合性**: 同じ変更が複数回リリースに乗ることはないはず。差分の重複検出を入れる

### このPhaseで作らないもの

- 自動デプロイ連携 (sf CLIの領分、本OSSの目的外)
- リリース後の自動検証 (既存CIの領分)

---

## Phase 5: オンボーディングと属人化排除

### 目的

プロジェクト仕様を知らない人でも、AIとの対話だけで全体像を理解し、作業を開始できる状態を完成させる。本OSSのもう一つの中核目的を達成する。

### 概要

Phase 2 の `/onboard` を本格化させ、ロール別の読み順制御、段階的な情報提示、対話的な深掘りを実装する。persona別 subagent を整備する。

### ゴール (完了条件)

- `/onboard` に `--role` オプションが追加される (new-joiner / reviewer / release-manager / customer-facing)
- ロール別の読み順が `.sfai/context-map.yaml` で定義される
- 新規参画者が仕様を知る人間に質問せず、AIとの対話のみで主要ドメインを把握できる
- 対話ログから「よく聞かれる質問」を集計し、 FAQ として蓄積する仕組みが動く
- ユーザビリティテスト (実際の新規参画者1名による検証) を実施し、所要時間と理解度を計測

### 必要なポイント

**context-map.yaml の構造**

```yaml
project:
  name: <project>
  domains:
    - id: sales
      description: 営業関連機能
      primary_objects: [Account, Contact, Opportunity]
      key_docs:
        - docs/generated/objects/Account.md
        - docs/human/business-notes/sales-process.md
    - id: service
      # ...

personas:
  new_joiner:
    goal: 2週間で主要ドメインを理解する
    read_order:
      - docs/generated/system-index.md
      - docs/human/business-notes/overview.md
      - domains:*  # すべてのドメイン
    depth: summary_first
  reviewer:
    goal: PRを適切にレビューする
    read_order:
      - docs/ai-augmented/change-summaries/latest.md
      - ops/registry/manual-steps-registry.md
    depth: detail_on_demand
  # ...

entry_prompts:
  new_joiner: .claude/prompts/onboard-new-joiner.md
```

**persona別 subagent**

| Persona | Subagent | 特徴 |
|---|---|---|
| new_joiner | onboarding-guide | 段階的、質問を受ける、進捗を記録 |
| reviewer | review-assistant | PRレビュー観点を提示 |
| release-manager | release-advisor | リリース準備の抜け漏れを指摘 |
| customer-facing | customer-impact-explainer | 顧客視点での影響を整理 |

### 要点

- **段階的提示が鍵**: 一度に全部見せない。「まず全体像、次にドメイン、次に個別」と段階化
- **質問駆動**: 参画者が質問した内容に応じて次に読むべきものを提示する対話型
- **進捗の記録**: どこまで理解したかを `.sfai/onboarding-state.json` に記録 (ローカル、gitignore)
- **FAQ蓄積の自動化**: 対話ログから頻出質問を抽出し、`docs/human/faq/` に蓄積 (AI_MANAGEDブロック、人間が精査)

### 懸念事項・注意事項

- **AIの誤情報による誤学習**: 新規参画者はAIの回答を信じやすい。重要情報は必ず知識グラフまたは人手ドキュメントから引用元を明示
- **ドメイン理解と業務理解のギャップ**: 知識グラフだけでは業務ルールは分からない。HUMAN_MANAGED領域の充実が前提条件。Phase 5はこの前提を明記し、`docs/human/` が空だと機能しないことを警告
- **プライバシーと記録**: 対話ログに個人情報や顧客情報が含まれうる。FAQ抽出時はフィルタリング
- **「AIに聞けば何でも分かる」という幻想の管理**: AIは万能ではない。分からないことは「分からない」と答える設計を貫く

### このPhaseで作らないもの

- 動画コンテンツ自動生成 (スコープ外)
- 多言語対応 (将来検討)
- スキルレベル判定 (将来検討)

---

## Phase 6: Plugin化とアダプタ拡張

### 目的

本OSSを他プロジェクト・他組織に配布可能な状態にする。Claude CodeプラグインとAntigravity設定を整備し、`npm install` + `plugin install` で導入完了する体験を作る。あわせて **Salesforce DX MCP Server アダプタ** を実装し、`force-app/` ローカルを持たない調査ユースケースにも対応する。導入プロファイル (minimal / standard / full) を提供して中小企業向けの最小導入パスを成立させる。

### 概要

`claude-plugin/` ディレクトリをPlugin形式で整備し、npmパッケージ化する。Antigravity用の設定も同梱する。`adapters/dx-mcp/` で Salesforce DX MCP Server をライブ org アクセスのアダプタとして実装する。導入手順書とトラブルシューティングを整備する。

### ゴール (完了条件)

- npmパッケージ `@salesforce-ai/sfai` として公開可能な状態
- Claude Codeプラグインとして `/plugin install` で導入可能
- Antigravity で同じ subagent/prompt が動作する (互換確認)
- **3 つの導入プロファイル** (minimal / standard / full) が `sfai init --profile <name>` で選択可能
- **DX MCP アダプタ** (`adapters/dx-mcp/`) が動作し、`sfai init --source dx-mcp` でローカル `force-app/` 不要で起動できる
- Agentforce Vibes IDE から `sfai` CLI が呼び出せることを動作確認
- 新規プロジェクトへの導入が30分以内で完了する
- 導入手順書が `docs/01-getting-started-*/` に整備される
- サンプルプロジェクト (`examples/sample-project/`) で動作確認
- CHANGELOG.md、CONTRIBUTING.md、SECURITY.md、LICENSE (Apache 2.0)、NOTICE が揃う
- 脆弱性スキャン (npm audit / Dependabot) が CI に組み込まれている
- **検証ゲート**: 2 つの異なるプロジェクトで導入実証 (1 つは中小企業相当、1 つは大企業相当を想定)

### 導入プロファイル

| プロファイル | 含まれるもの | 想定対象 |
|---|---|---|
| minimal | Phase 1 の知識グラフ + render | 中小企業、まず構造化したいケース |
| standard | Phase 1〜3 + 5 | 通常運用 |
| full | Phase 1〜6 全機能 + DX MCP アダプタ | 大企業 / ベンダー本格運用 |

各プロファイルは `sfai init --profile <name>` で展開され、不要な subagent / command / hooks は無効化される。

### 必要なポイント

**パッケージ構成**

```
@salesforce-ai/sfai
├─ bin/sfai                 # CLIエントリポイント
├─ dist/                    # コンパイル済みTS
├─ templates/               # 初期化テンプレート
└─ package.json
```

**plugin.json の整備**

- plugin名、バージョン、互換性、依存関係を明記
- subagent、command、hooks、skills を列挙
- インストール時のセットアップスクリプト

**Antigravity adapter**

- `prompts/` 配下の指示書はClaude CodeとAntigravityで共有
- `.antigravity/tasks.json` と `.antigravity/agent-workspaces.yaml` を生成する `sfai init --antigravity` コマンド

**初期化コマンド**

```bash
sfai init                   # Claude Code前提
sfai init --antigravity     # Antigravity前提
sfai init --both            # 両方
```

### 要点

- **導入障壁の最小化**: コマンド3つ以内で動作開始するUXを目指す
- **設定ファイルの自動生成と検証**: 手書きを強いない
- **互換性マトリクス**: Claude Codeのバージョンとの互換性を明示
- **ドキュメントは導入者視点で**: 開発者視点ではなく、初めて触る人が読める導入手順

### 懸念事項・注意事項

- **Claude Code Plugin仕様の流動性**: マーケットプレイスや配布方式が変わる可能性がある。Git clone経由のインストール手順も併記して保険をかける
- **Salesforce組織バージョンの差異**: API version による差異がある。対応バージョンを明示
- **ライセンス**: Apache License 2.0 で確定済み ([ADR](./.agents/knowledge/decisions/2026-05-07-license-apache-2.0.md))。顧客情報の取り扱いは `SECURITY.md` で明示
- **セキュリティ**: 利用者の組織メタデータがローカルのSQLiteに入る。ドキュメントで扱いを明示し、gitignore サンプルを用意。OS キーチェーン連携による暗号化オプションを提供
- **プラグインの破壊的変更**: SemVer厳守。メジャーバージョンでの破壊的変更は事前アナウンス
- **DX MCP Server Beta 仕様の流動性**: アダプタ層 (`adapters/dx-mcp/`) はバージョン互換マトリクスを CI で維持。仕様破壊が来てもコア機能 (LocalSourceAdapter) は影響を受けない設計を厳守

### このPhaseで作らないもの

- マーケットプレイスでの有料提供 (OSSなので)
- SaaS化 (スコープ外)

---

## v0.3.0: 内部検証実証フェーズ (旧 Phase 7 前段)

> **2026-05-10 改訂**: 元の「Phase 7: 普及フェーズ」は 2026-05-08 に「ドキュメント完全化」に変質し、9 個の派生 Phase (8〜15) を生んだ ([scope-discipline-and-phase-restructure ADR](./.agents/knowledge/decisions/2026-05-10-scope-discipline-and-phase-restructure.md))。
> その実態は v0.2.0 として整流化済み。本セクションは **本来の Phase 7 北極星「現場で本当に価値が届いているか実証する」** を v0.3.0 として独立させたもの。

### 北極星

> **現参画プロジェクトに v0.2.0 を導入し、「資料更新が不要・ソースが正本」を週次運用で実証する。技術拡張ではなく実利用と KPI 計測に注力する。**

### ゴール条件 (Definition of Done)

[実装フェーズ一覧 § 内部検証完了の DoD](#実装フェーズ一覧--リリース計画) の 5 項目のうち **3 項目以上で達成**:

1. `sfai sync` 週次運用 4 週連続
2. 利用者主観評価 5 段階で 4 以上
3. 運用タスク AI 任せ可能比率 60% 以上
4. リリース準備時間 50% 短縮
5. 手動作業見逃し 0 / リリース

### スコープ (やること)

- 現参画 Salesforce プロジェクトに v0.2.0 を `sfai init --bootstrap` で導入
- 週次運用ループ (`sfai sync` → 差分確認 → AI 文面更新 → リリース準備) を 4 週継続
- 既知 pitfalls の解消 (本規律の最初の実例として):
  - [`method-summary-table` の SOQL 検出漏れ](./.agents/knowledge/pitfalls/2026-05-09-method-summary-table-soql-detection.md) を v0.3.0 内で解消
  - その他 `pitfalls/` に蓄積された制約のうち、実利用で顕在化したものを優先対処
- 運用ログと利用者ヒアリングで KPI を計測
- 振り返りを `retrospectives/` に毎週記録

### Out of Scope (やらないこと — 厳守)

- **新メタデータ種対応** (現状 21 種で十分。実利用で必要性が出てから検討)
- **AI 推論基盤の機能拡張** (`/sfai-explain` の機能追加、新 ExplainKind 追加 等)
- **新サブエージェント / 新 slash command の追加**
- **Mermaid / 図表の表現拡充**
- **OSS 公開準備** (v1.0.0 に先送り)
- **社内他プロジェクトへの展開** (v0.4.0 に先送り)

これらの誘惑が出た場合は `improvements/` に記録するだけで終え、Phase は増やさない (禁則 14)。

### 検証ゲート

- 4 週運用後、`retrospectives/2026-XX-XX-v0.3.0-completion.md` を起こし、DoD 5 項目の達成度を計測
- 3 項目以上達成 → v0.3.0 完了宣言、v0.4.0 (社内展開) 着手判断
- 3 項目未達 → 原因分析を `decisions/` に記録、v0.3.0 内で対処継続 (新 Phase を立てない)

### 懸念事項・注意事項

- **技術拡張の誘惑が強い**: v0.2.0 で AI 文面生成基盤が動いたため「次はこれを足したい」となりやすい。Out of Scope を毎週見直して逸脱を防ぐ
- **利用者の運用負荷**: 週次でヒアリング/ログ収集を依頼するため、利用者側にも負荷がかかる。最小限のフォーマットに揃える
- **KPI 計測の客観性**: 主観評価が混じるため、定量指標 (運用ログ、リリース準備時間) を優先する

---

## v0.4.0+: 社内展開フェーズ (将来)

v0.3.0 完了後、社内他プロジェクトへの展開を行う。詳細計画は v0.3.0 完了時点で別 ADR で起こす。

### 北極星 (暫定)

> v0.2.0 + v0.3.0 で実証した運用体験を、社内の他 Salesforce プロジェクトに移植可能にする。

### スコープ候補 (v0.3.0 完了時に確定)

- 2 件目以降のプロジェクトでの導入
- minimal / standard / full プロファイルの選択指針整備
- 社内向けドキュメント / オンボーディング資料

---

## v1.0.0+: 社外展開フェーズ (将来)

v0.4.0 で社内展開が成立したら OSS 公開と社外コンサル導入を行う。元の「Phase 7: 普及フェーズ」の以下の指標を継承する。

| 指標 | 目標 |
|---|---|
| 月次アクティブ導入プロジェクト数 | 公開後 6 か月で 10、12 か月で 30 |
| GitHub Issue 中央値解決時間 | 14 日以内 |
| 公開導入事例数 | 12 か月で最低 3 件 |
| AI 出力一致率 | 95% 以上を維持 |
| Salesforce メタデータ型カバレッジ | 公開時 80%、12 か月で 95% |

含まれる活動:

- GitHub 公開、Issue / PR テンプレ、コントリビューションガイドライン整備
- リリースノートの定期発行、月次進捗共有
- サンプルプロジェクトの充実 (顧客固有情報を含まないダミー)
- 導入事例の収集 (許諾を得た範囲で)
- Salesforce 公式 (sf CLI / DX MCP / Code Analyzer / Agentforce DX) 仕様変更への追従

### 懸念事項・注意事項

- **コミュニティ運営コスト**: 積極的に広めると issue 対応負荷が増える。リソース配分を計画
- **互換性維持のコスト**: Salesforce API 進化への追従が継続的に必要
- **フォーク問題**: 方向性が分かれるフォークが出る可能性がある。ガバナンス方針を明示

---

## メタ層と配布物層の分離

本リポジトリは **2 つの層を物理的に分離** する。両層は似た見た目のファイル (`CLAUDE.md` `AGENTS.md` `.claude/` `.agents/`) を持つが、**用途が完全に異なる**。詳細 ADR: [メタ層 vs 配布物層 ADR](./.agents/knowledge/decisions/2026-05-07-meta-vs-distribution-layer-separation.md)

### 2 つの層の定義

| 層 | 配置 | 用途 | 読む人 |
|---|---|---|---|
| **メタ層** | リポジトリルート直下 / `.claude/` / `.agents/` | 本 OSS を **開発する側** が使う指示書・設定・ナレッジ | OSS 開発者、開発時の AI |
| **配布物層** | `scaffold/` `claude-plugin/` `examples/` `docs/` 配下 | OSS を **導入した利用者** に届く成果物 | OSS 利用者、利用者プロジェクトの AI |

### ディレクトリ構造（確定版）

```
SF-AI-Foundation/
│
├── README.md                        ← プロジェクト全体
├── CLAUDE.md                        ← [メタ] OSS 開発時の AI 憲法
├── AGENTS.md                        ← [メタ] OSS 開発時の自律ループ
├── IMPLEMENTATION_GUIDE.md          ← [メタ] 実装方針書 (本書)
├── LICENSE                          ← Apache 2.0
├── .claude/                         ← [メタ] 開発時の Claude Code 設定
├── .agents/                         ← [メタ] 開発時のナレッジ蓄積
├── .gitignore
│
├── packages/                        ← [ソース] OSS 本体 (monorepo, sfai-core 等)
│
├── scaffold/                        ← [配布物] sfai init で利用者プロジェクトに展開
│   ├── CLAUDE.md.eta                ←   利用者向け CLAUDE.md ひな型
│   ├── AGENTS.md.eta                ←   利用者向け AGENTS.md ひな型
│   ├── .claude/                     ←   利用者向け Claude Code 設定
│   ├── .agents/                     ←   利用者向けナレッジ基盤
│   └── .gitignore
│
├── claude-plugin/                   ← [配布物] Claude Code Plugin 形式 (Phase 6)
│
├── examples/                        ← [配布物] サンプル / 動作確認用
│   └── sample-project/              ←   ダミー Salesforce DX プロジェクト (Phase 6)
│
├── docs/                            ← [配布物] 利用者向け公開ドキュメント
│   ├── 01-getting-started/
│   ├── 02-concepts/
│   └── 03-reference/
│
└── tests/
    └── golden/                      ← [開発時テスト] ゴールデンテスト
```

### 判別ルール（ファイル編集前に必ず確認）

1. **ルート直下** または `.claude/` / `.agents/` 配下 → **メタ層**（OSS 開発側の挙動を変える）
2. **`scaffold/` 配下** → **配布物のひな型**（OSS 利用者に届く内容を変える）
3. **`packages/` 配下** → OSS のソースコード（実装）
4. **`docs/` 配下** → 利用者向け公開ドキュメント
5. **`examples/` `claude-plugin/` `tests/` 配下** → 用途が明確な専用領域

「この修正は OSS 開発者が見るのか、OSS 利用者が見るのか」で迷ったら、常にこのルールに戻る。

### 命名規則

- `scaffold/` 配下のテンプレートで **eta 変数展開を伴うもの** は `.eta` 拡張子 (例 `CLAUDE.md.eta`)
- 静的コピーで済むものは `.eta` を付けない (例 `.gitignore`、設定 JSON)
- 同名ファイル (`CLAUDE.md` と `scaffold/CLAUDE.md.eta`) は **対象読者が違うため内容も違う**。単純コピー禁止

### Phase との対応

各 Phase では、メタ層 (本リポジトリの開発活動) と配布物層 (利用者向け成果物) の **両方を進める** が、対応する Phase が異なるので注意:

| Phase | メタ層で進めること | 配布物層で進めること |
|---|---|---|
| 1 | グラフ・CLI 実装、ゴールデンテスト基盤 | (まだ無し) |
| 2 | 検証ゲート、コスト計測 | `scaffold/.claude/` の subagent / command 雛型、`scaffold/.agents/` のナレッジ基盤 |
| 3 | 一致率 CI、SARIF 取り込み | `scaffold/.claude/commands/classify-diff.md.eta` 等 |
| 4 | 手動作業レジストリ実運用 | `scaffold/.claude/commands/release-prep.md.eta` 等 |
| 5 | persona 別オンボーディング検証 | `scaffold/CLAUDE.md.eta` `scaffold/AGENTS.md.eta` の本格執筆 |
| 6 | 導入プロファイル / DX MCP アダプタ | `claude-plugin/` `examples/sample-project/` `docs/01-getting-started/` |
| 7 | 普及・改善継続 | 配布物全体のメンテと拡充 |

---

## 横断的に守るべき禁則事項

以下は全Phaseを通じて禁止する。実装時に発見したら即修正する。

### 禁則1: 正本のMarkdown化

- `docs/` 配下のMarkdownを正本扱いしない
- `force-app/` と Git のみが正本

### 禁則2: 知識グラフの直接書き換え

- AIやhooksから `.sfai/graph.sqlite` を直接INSERT/UPDATEしない
- 必ず `sfai` CLIを経由する

### 禁則3: AIによる決定的処理の代替

- XMLパース、差分検出、スキーマ検証はCLIで決定的に行う
- AIに「このXMLをパースして」と頼まない

### 禁則4: CLAUDE.mdの肥大化

- 15KBを超えたら分割または外部化
- 個別オブジェクトの仕様はCLAUDE.mdに書かない

### 禁則5: 人手補完領域へのAI上書き

- `HUMAN_MANAGED` ブロックをAIが書き換えない
- 再描画時に保護するマージロジックを必ず実装

### 禁則6: subagentの乱用

- 会話的タスクはメインエージェントで
- コンテキスト隔離が必要な処理のみsubagent化

### 禁則7: hooksでの重い処理

- `PostToolUse` の実行時間は **wall-clock 2 秒以内** を目標 (Node CLI cold-start を踏まえた現実値)。利用者が大規模 org で hook を無効化する選択は許容
- `--incremental --quiet` を徹底
- 重い処理が必要な場合は非同期化、または明示的なコマンド (例 `/classify-diff`) として切り出す

### 禁則8: 会社固有情報のOSS混入

- サンプル、テスト、ドキュメント全てで顧客名や組織特有情報を使わない
- ダミーデータを用意

### 禁則9: 破壊的変更の無警告リリース

- SemVer厳守
- メジャーバージョンでの破壊的変更は CHANGELOG.md と移行ガイドを必ず添付

### 禁則10: 目的を見失うスコープクリープ

- 「AIにコードを書かせる」「自動デプロイ」などは本OSSの目的外
- 新機能追加時は「属人化排除」「運用タスク自動化」「再現性提供」のどれに貢献するか必ず確認

### 禁則11: 公式エコシステムとの重複・依存禁忌

以下のツールへの直接依存・機能重複は禁止する。詳細は [公式エコシステムとの責務境界](#公式エコシステムとの責務境界) 参照。

- **JSforce による直接 org 接続**: Layer 1 (`force-app/` + Git) を正本とする原則を破る。org アクセスが必要な場合は sf CLI / @salesforce/source-deploy-retrieve / DX MCP Server (アダプタ経由) を使う
- **SFDX Hardis 機能の再実装 / 同梱**: AGPL ライセンスの伝播リスクと機能重複
- **Provar への依存**: 商用ライセンスロックイン
- **Salesforce Code Analyzer の静的ルールを本 OSS で再実装**: SARIF 出力を入力に使う設計のみ許可

### 禁則12: メタ層と配布物層の混在

- ルート直下の `CLAUDE.md` `AGENTS.md` `.claude/` `.agents/` (= **メタ層**) と、`scaffold/` 配下のひな型 (= **配布物層**) の混同を禁止
- メタ層ファイルを `scaffold/` にそのままコピーしてはいけない（対象読者が違うため、内容を必ず利用者向けに書き直す）
- 編集前に [メタ層と配布物層の分離](#メタ層と配布物層の分離) の判別ルールに必ず照らす

### 禁則13: 配布物層を OSS 開発活動の入力として読み込まない

- メタ層の Claude Code / 開発者は、`scaffold/` 配下の `.eta` ファイルを **「資料」としては読むが「指示書」としては読まない**
- `scaffold/CLAUDE.md.eta` を読んで自分の指示と勘違いしてはいけない（あくまで利用者プロジェクトに展開された後に意味を持つ）
- 同様に `scaffold/.claude/commands/*.eta` のスラッシュコマンドは本リポジトリでは動作しない（動作するのはルート `.claude/commands/`）

### 禁則14: Phase の安易な増殖禁止

2026-05-10 に明文化された規律。詳細は [`AGENTS.md` § 3 Phase スコープ規律](./AGENTS.md#3-phase-スコープ規律) と [scope-discipline-and-phase-restructure ADR](./.agents/knowledge/decisions/2026-05-10-scope-discipline-and-phase-restructure.md) を参照。

- Phase 内で発見された課題を **新 Phase に逃がさない** (原則 Phase 内で対処)
- 新 Phase 追加には次の閾値を **両方** 満たすこと: (a) 現 Phase 北極星から明確に外れる、(b) 人間オーナーの明示承認
- **検証だけで Phase を立てない** (検証は元の Phase の DoD に含める)
- 新 Phase 着手 ADR には「なぜ前 Phase の中ではなく独立 Phase である必要があるか」を必ず記述
- リリース粒度のテーマを超えそうになったら、それは新 Phase ではなく **新リリース (v0.(x+1).0) のサイン**

---

## 意思決定の記録

実装中に重要な設計判断をしたら、以下フォーマットで追記する。

### 2026-04-18: CLI言語をTypeScript + Node.jsに決定

- **判断**: TypeScript + Node.js 20+
- **代替案**: Python
- **理由**:
  - Salesforce DXエコシステム (sf CLI) と揃う
  - `@salesforce/source-deploy-retrieve` の公式SDKが使える
  - hooks経由で頻繁に呼ばれるため起動速度が重要 (Node.jsの方が速い)
  - npm配布により利用者の追加ランタイム要求がない
- **トレードオフ**: データ分析用途はPythonの方が書きやすいが、本OSSの中核は分析ではなくパース・変換のため問題にならない

### 2026-04-18: 主要AI基盤をClaude Codeに決定

- **判断**: Claude Codeを主、Antigravityを副とする
- **理由**:
  - CLAUDE.md / subagents / slash commands / hooks / skills / plugins が揃う
  - OSS配布との相性(Plugin機構)
  - コーディングエージェントとしての成熟度
- **トレードオフ**: Antigravity単体ユーザへのアピールは相対的に弱くなる。両対応で緩和

### 2026-04-18: 知識グラフDBをSQLiteに決定

- **判断**: SQLite (better-sqlite3)
- **代替案**: DuckDB、Neo4j、JSON
- **理由**:
  - ゼロ設定、ファイル1つで完結
  - 十分高速
  - 運用負荷が最小
- **トレードオフ**: 超大規模組織で分析クエリが遅い可能性。実例が出てから対処

### 2026-05-07: ライセンスを Apache 2.0 に確定

- **判断**: Apache License 2.0
- **代替案**: MIT, MPL 2.0, AGPL
- **理由**: 特許条項あり、企業利用親和、Salesforce 公式 (sf CLI / SDR / Code Analyzer は BSD-3 や Apache 2.0 系) との整合
- **詳細 ADR**: [`.agents/knowledge/decisions/2026-05-07-license-apache-2.0.md`](./.agents/knowledge/decisions/2026-05-07-license-apache-2.0.md)

### 2026-05-07: テンプレートエンジンを eta に確定

- **判断**: eta (https://eta.js.org/)
- **代替案**: handlebars, EJS, LiquidJS, 独自
- **理由**: 軽量 (≈3KB)、TS 親和、async サポート、メンテ活発
- **詳細 ADR**: [`.agents/knowledge/decisions/2026-05-07-template-engine-eta.md`](./.agents/knowledge/decisions/2026-05-07-template-engine-eta.md)

### 2026-05-07: Salesforce DX MCP Server はアダプタ層として後付け統合

- **判断**: `adapters/dx-mcp/` を Phase 6 で実装。Phase 2 で共通インターフェースだけ先回りで切る
- **代替案**: Phase 2 から必須統合 / 完全に無視
- **理由**: Beta 仕様変動への耐性、本 OSS のオフライン独立性、最小導入パスとの整合
- **詳細 ADR**: [`.agents/knowledge/decisions/2026-05-07-dx-mcp-adapter-pattern.md`](./.agents/knowledge/decisions/2026-05-07-dx-mcp-adapter-pattern.md)

### 2026-05-07: Code Analyzer v5 の SARIF を差分分類器の入力に

- **判断**: 静的解析を本 OSS で再実装せず、Code Analyzer v5 の SARIF 出力を `sfai diff --include-static-analysis` で取り込む
- **代替案**: 本 OSS で再実装 / 完全無視
- **理由**: 公式重複回避、業界標準 SARIF、本 OSS は業務影響に集中
- **詳細 ADR**: [`.agents/knowledge/decisions/2026-05-07-code-analyzer-sarif-integration.md`](./.agents/knowledge/decisions/2026-05-07-code-analyzer-sarif-integration.md)

### 2026-05-07: AI 関与スキーマに `source` 列を必須化

- **判断**: change_summary 等の各フィールドに `source: deterministic | ai | human` メタデータを必須化、ajv で強制
- **代替案**: ファイル冒頭で全体を AI と宣言 / naming convention
- **理由**: フィールド単位の再現性検証とゴールデンテスト・一致率 CI の基盤になる
- **詳細 ADR**: [`.agents/knowledge/decisions/2026-05-07-source-column-three-layer-boundary.md`](./.agents/knowledge/decisions/2026-05-07-source-column-three-layer-boundary.md)

### 2026-05-07: IMPLEMENTATION_GUIDE.md v1.1 改訂

- **判断**: コンセプト整合・3 セグメント・再現性・公式エコ統合・検証ゲート・人間側 KPI の 6 本柱で改訂
- **代替案**: v1.0 のまま着手
- **理由**: README のコンセプト軸との乖離、Salesforce 公式エコシステム (DX MCP / Code Analyzer / ApexGuru / Agentforce DX) の取り込み必要性、再現性が「JSON Schema 一文」だけだったのを 5 層に分けて強化
- **詳細 ADR**: [`.agents/knowledge/decisions/2026-05-07-implementation-guide-revision-v1.1.md`](./.agents/knowledge/decisions/2026-05-07-implementation-guide-revision-v1.1.md)

### 2026-05-07: メタ層と配布物層をディレクトリで物理分離

- **判断**: ルート直下=メタ層、`scaffold/`=配布物層、で物理分離。判別ルールを明文化、禁則 12/13 を追加
- **代替案**: ファイル命名で区別 / メタ層を `meta/` 配下へ / 別リポジトリ分離 / monorepo パッケージ化
- **理由**: ルート直下=メタ という単純ルールで判別可能、Claude Code の慣行（CLAUDE.md ルート配置）と整合、既存リンク資産を壊さない
- **詳細 ADR**: [`.agents/knowledge/decisions/2026-05-07-meta-vs-distribution-layer-separation.md`](./.agents/knowledge/decisions/2026-05-07-meta-vs-distribution-layer-separation.md)

### 2026-05-10: Phase スコープ規律の確立とリリース計画の整流化 (Phase 7〜15 を v0.2.0 へ統合)

- **判断**: 2026-05-08 〜 05-09 に Phase 7 配下で 9 個の派生 Phase (8〜15) が連鎖追加された反省を踏まえ、(1) `AGENTS.md` § 3 として Phase スコープ規律を恒久ルール化、(2) 旧 Phase 7〜15 を v0.2.0 リリースとして統合、(3) 本来の北極星「内部検証実証」を v0.3.0 として独立、(4) 禁則 14 (Phase 増殖禁止) を追加、(5) 内部検証完了の DoD (5 項目中 3 項目達成) を明示
- **代替案**: ナレッジファイルもリネーム / 規律のみ追加でリリース計画は据え置き / 元の Phase 1〜7 構造を完全廃止
- **理由**: 過去履歴を保全しつつ将来の暴走を抑止できる、CHANGELOG と Phase の乖離を解消できる、オーナー要望「本当に価値あるものを目指して着実に進む」に合致
- **詳細 ADR**: [`.agents/knowledge/decisions/2026-05-10-scope-discipline-and-phase-restructure.md`](./.agents/knowledge/decisions/2026-05-10-scope-discipline-and-phase-restructure.md)

### (以降、実装中の判断をここに追記)

---

## 付録: 実装開始前のチェックリスト

Phase 1着手前に以下を確認する。

- [ ] 本方針書 (v1.1) を関係者でレビュー済み
- [ ] Node.js 20+ の開発環境構築済み
- [ ] Salesforceのサンプル組織 (Developer Edition または scratch org) が利用可能
- [ ] Claude Code が動作する環境が整っている
- [ ] リポジトリ初期化済み、LICENSE は Apache 2.0 で確定済み
- [ ] CI基盤 (GitHub Actions等) の方針決定済み
- [ ] sf CLI (`@salesforce/cli`) と @salesforce/source-deploy-retrieve のバージョンを `package.json` に固定
- [ ] Salesforce Code Analyzer v5 が動作環境で利用可能 (SARIF 出力テスト用)
- [ ] `.agents/knowledge/` のテンプレート (`.agents/templates/`) を理解している

各Phase着手前に以下を確認する。

- [ ] 前Phaseのゴール条件が達成されている
- [ ] 当該Phaseのゴール条件を関係者と合意している
- [ ] 当該Phaseの懸念事項への対策方針が定まっている
- [ ] このPhaseで「作らないもの」を明確化している

---

**本方針書は生きたドキュメントです。実装中の発見や判断は [意思決定の記録](#意思決定の記録) に追記してください。**
