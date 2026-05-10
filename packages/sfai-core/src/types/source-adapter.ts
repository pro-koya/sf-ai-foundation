// ----------------------------------------------------------------------------
// Source adapter interface
//
// Phase 1: LocalSourceAdapter (force-app/ をローカル読み)
// Phase 6: DxMcpSourceAdapter (Salesforce DX MCP Server 経由)
//
// 共通インターフェースを Phase 2 までに固めることで、コアの実装を
// アダプタ追加時に変えずに済むようにする。
// ----------------------------------------------------------------------------

import type { SourceAdapterKind } from "./graph.js";

export interface SourceAdapterConfig {
  readonly kind: SourceAdapterKind;
  readonly rootPath?: string;
  readonly orgAlias?: string;
}

export interface MetadataDescriptor {
  readonly type: string;
  readonly fullyQualifiedName: string;
  readonly sourcePath: string;
  readonly contentHash: string;
}

export interface FetchOptions {
  readonly types?: readonly string[];
  readonly since?: string;
}

export interface SourceAdapter {
  readonly kind: SourceAdapterKind;

  /** メタデータ記述子を列挙する。実体の取得は loadContent で行う */
  list(options?: FetchOptions): Promise<readonly MetadataDescriptor[]>;

  /** 個別メタデータの本体を取得する */
  loadContent(descriptor: MetadataDescriptor): Promise<string>;

  /** 入力ソース全体の決定的ハッシュを返す。incremental 判定に使う */
  computeSourceHash(): Promise<string>;
}
