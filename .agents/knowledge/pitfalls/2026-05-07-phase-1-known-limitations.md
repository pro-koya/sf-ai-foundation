---
type: pitfall
date: 2026-05-07
title: Phase 1 完了時点の既知制約 (Phase 2 着手前に把握すべき項目)
severity: medium
tags: [phase-1, known-limitations, salesforce-metadata]
---

# Phase 1 完了時点の既知制約

## 何が起きうるか

Phase 1 の実装は標準形のメタデータを前提としているため、以下のケースで意図した動作にならない可能性がある。

## 既知の限界

### 1. メタデータ型の対応範囲

**対応済み**: CustomObject, CustomField, ValidationRule, Flow, ApexClass, ApexTrigger, PermissionSet, Profile の 8 種。
**未対応**:
- LWC (Lightning Web Component)
- Aura Component
- Visualforce Page / Component
- Layout
- RecordType
- StaticResource
- CustomMetadataType (型定義は対応、レコードは未対応)
- EmailTemplate / Workflow / ApprovalProcess
- CustomTab / FlexiPage / CustomApplication
- (Phase 7 で順次拡充)

利用者プロジェクトに上記が含まれる場合、graph build は **エラー停止せず無視** する。pitfall としては「利用者が見えていると思っているメタデータが見えていない」という認知の不一致が起きうる。

### 2. Permission Set / Profile の詳細権限

**現状**: label / license / userLicense / description のみ抽出。
**未対応**: object permissions / field permissions / system permissions / record type visibilities / page accesses / etc.
**回避策**: 詳細権限が業務的に重要な場合、Phase 1 の出力では分析できない旨を利用者に明示する。

### 3. Flow の意味解釈

**現状**: メタデータ (label, status, type, triggeringObject) のみ取り込み。
**未対応**: ノード単位の意味解釈、サブフロー参照、ループ / 条件分岐の構造化。
**Phase 計画**: Phase 3 で AI 層が意味解釈を担当 (本 OSS の設計原則 1 により決定的処理に留めず AI 層へ委譲)。

### 4. 増分ビルドが実は全件書き戻し

**現状**: `sfai graph build --incremental` は SQLite を `DELETE FROM ... ; INSERT ...` で全件書き戻し。
**根拠**: ファイル単位のハッシュ比較 → 差分検出ロジックが Phase 1 では未実装。
**回避策**: 大規模組織 (5000+ オブジェクト) では時間がかかる可能性。Phase 7 で fine-grained 増分対応予定。

### 5. ApexClass / ApexTrigger の API バージョン

**現状**: ハードコードで `"62.0"` を返す。実際は `*.cls-meta.xml` の `<apiVersion>` を読むべき。
**回避策**: Phase 2 サイクル 2-1 で簡単に修正可能。ハイ優先度ではない。

### 6. ApexTrigger のイベント解析

**現状**: 正規表現 `/trigger\s+(\w+)\s+on\s+(\w+)\s*\(([^)]+)\)/i` でヘッダのみ解析。
**限界**:
  - コメント内の `trigger` キーワードに誤反応する可能性
  - 改行を跨ぐトリガー宣言は認識しない
**回避策**: 標準的な記法では問題ない。複雑な記法は Phase 7 で AST ベースの解析に置換。

### 7. force-app/ 以外のディレクトリ構造

**~~現状~~**: ~~force-app/ 固定で他のパッケージディレクトリは無視~~
**解消済み**: 2026-05-07 サイクル K で `sfdx-project.json` 対応により解決。 [decisions/2026-05-07-sfdx-project-multi-package.md](../decisions/2026-05-07-sfdx-project-multi-package.md)

### 8. .forceignore の未対応

**現状**: `.forceignore` の除外指定を読まない。
**結果**: 利用者が意図的に除外したメタデータも graph に取り込まれる可能性。
**Phase 計画**: Phase 7 で対応。それまでは `LocalSourceAdapterOptions.packageDirectories` で代替可能。

### 9. Windows パス区切り

**現状**: パス処理に `/` を直接使っている箇所あり (`segments.split("/")`)。
**結果**: Windows 環境では `\\` が混在し動作しない可能性。
**回避策**: macOS / Linux 環境を前提とする旨を CONTRIBUTING.md に記載。Phase 7 で `path.posix` 統一にリファクタ。

### 10. CI 環境で `npm test` 未確認

**現状**: 1 ターン内でコードを書き上げたため、実環境での `npm install && npm test` が未走行。
**期待される問題**:
- TypeScript strict モードで型エラー (特に SQLite mapping)
- Biome lint エラー (`useImportType` 等)
- vitest の glob 設定ミス
**Phase 計画**: Phase 2 サイクル 2-1 で初回 CI 通過を最優先項目とする。

## 根本原因

- Phase 1 で「構造的完成」を優先し、実環境動作確認を Phase 2 の検証ゲートに繰り延べたため
- Salesforce メタデータの仕様が広大で、Phase 1 ではコアな 8 種に絞った

## 回避策・修正

各項目に上記参照。

## 再発防止

- Phase 2 サイクル 2-7 (サンプルプロジェクト動作確認) で、上記の各制約に対応する **smoke test** を組み込む
- Phase 5 の persona 別検証ゲートで「制約により動かない」事象を逐一拾う
- IMPLEMENTATION_GUIDE.md の Phase 7 章に既知制約の解消ロードマップを記載

## 関連ナレッジ

- [2026-05-07: Phase 1 完了宣言](../decisions/2026-05-07-phase-1-completion.md)
- [2026-05-07: Phase 2 計画](../decisions/2026-05-07-phase-2-plan.md)
- [2026-05-07: sfdx-project.json 多パッケージ対応](../decisions/2026-05-07-sfdx-project-multi-package.md)
- [2026-05-07: Phase 1 引き継ぎ改善案](../improvements/2026-05-07-phase-1-handover-improvements.md)
