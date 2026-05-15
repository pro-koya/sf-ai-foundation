import type { MetadataDescriptor } from "../../types/source-adapter.js";

export interface ExtractContext {
  readonly descriptor: MetadataDescriptor;
  readonly content: string;
  readonly projectRoot?: string;
}

export const DEFAULT_API_VERSION = "62.0";
