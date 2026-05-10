// Salesforce DX MCP Server (Beta) アダプタ — Phase 6 stub 実装
//
// 詳細 ADR: .agents/knowledge/decisions/2026-05-07-dx-mcp-adapter-pattern.md
//
// 設計方針:
// - SourceAdapter インタフェース互換 (LocalSourceAdapter と差し替え可能)
// - Beta 仕様の流動性に対応するため、本 stub では「未接続」を明示的に投げる
// - Phase 7 で MCP GA 後に本実装する
//
// このアダプタを有効化する条件:
// - 利用者の環境に Salesforce DX MCP Server が稼働している
// - sf CLI が認証済み org に接続している
// - sfai graph build --source dx-mcp で明示的に opt-in

import type {
  FetchOptions,
  MetadataDescriptor,
  SourceAdapter,
} from "../../types/source-adapter.js";

export interface DxMcpSourceAdapterOptions {
  readonly orgAlias?: string;
  /** MCP Server の HTTP エンドポイント。未指定なら stdio 経由 */
  readonly endpoint?: string;
  /** API バージョン (Salesforce 側) */
  readonly apiVersion?: string;
}

export class DxMcpNotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DxMcpNotImplementedError";
  }
}

/**
 * Phase 6 stub: Beta 仕様の MCP Server に接続せず、明示的にエラーを投げる。
 * Phase 7 で公式 MCP TypeScript SDK 経由の実装に置き換える。
 */
export class DxMcpSourceAdapter implements SourceAdapter {
  readonly kind = "dx-mcp" as const;
  readonly #options: DxMcpSourceAdapterOptions;

  constructor(options: DxMcpSourceAdapterOptions = {}) {
    this.#options = options;
  }

  get options(): DxMcpSourceAdapterOptions {
    return this.#options;
  }

  async list(_options?: FetchOptions): Promise<readonly MetadataDescriptor[]> {
    throw new DxMcpNotImplementedError(
      "DxMcpSourceAdapter is not yet wired to a live Salesforce DX MCP Server. " +
        "This is a Phase 6 stub; Phase 7 will integrate the official MCP TypeScript SDK once the Beta GA is reached. " +
        "For now, please use --source local (default).",
    );
  }

  async loadContent(_descriptor: MetadataDescriptor): Promise<string> {
    throw new DxMcpNotImplementedError(
      "DxMcpSourceAdapter.loadContent is not yet implemented (Phase 6 stub).",
    );
  }

  async computeSourceHash(): Promise<string> {
    throw new DxMcpNotImplementedError(
      "DxMcpSourceAdapter.computeSourceHash is not yet implemented (Phase 6 stub).",
    );
  }
}
