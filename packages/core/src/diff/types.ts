// 差分検出の型定義
// Phase 3 サイクル 3-1: 決定的差分のみ。意味づけ (AI) は 3-3 以降。

export type ChangeKind = "added" | "modified" | "removed" | "renamed";

export type DiffCategory =
  | "data_model"
  | "automation"
  | "permission"
  | "ui"
  | "logic"
  | "operational"
  | "manual"
  | "unknown";

export interface ChangedFile {
  readonly path: string;
  readonly oldPath?: string;
  readonly changeKind: ChangeKind;
  readonly metadataType: string | null;
  readonly fullyQualifiedName: string | null;
  readonly category: DiffCategory;
  readonly addedLines: number;
  readonly removedLines: number;
}

export interface RawDiff {
  readonly fromRef: string;
  readonly toRef: string;
  readonly generatedAt: string;
  readonly files: readonly ChangedFile[];
  readonly totals: {
    readonly files: number;
    readonly addedLines: number;
    readonly removedLines: number;
    readonly byCategory: Readonly<Record<DiffCategory, number>>;
    readonly byChangeKind: Readonly<Record<ChangeKind, number>>;
  };
  readonly truncated: boolean;
}

export const DIFF_FILE_LIMIT_DEFAULT = 1000;
