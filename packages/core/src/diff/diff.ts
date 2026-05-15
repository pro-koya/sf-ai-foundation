import { classifyChangedFile } from "./classify-files.js";
import { diffFiles, statusCharToChangeKind } from "./git.js";
import {
  type ChangeKind,
  type ChangedFile,
  DIFF_FILE_LIMIT_DEFAULT,
  type DiffCategory,
  type RawDiff,
} from "./types.js";

export interface ComputeDiffOptions {
  readonly fromRef: string;
  readonly toRef: string;
  readonly cwd: string;
  readonly fileLimit?: number;
  /** 走査対象を force-app/ など特定パスに絞る */
  readonly pathPrefix?: string;
}

export function computeDiff(options: ComputeDiffOptions): RawDiff {
  const { files: rawFiles, numstat } = diffFiles(options.fromRef, options.toRef, options.cwd);
  const limit = options.fileLimit ?? DIFF_FILE_LIMIT_DEFAULT;
  const truncated = rawFiles.length > limit;
  const sliced = truncated ? rawFiles.slice(0, limit) : rawFiles;

  const filtered = options.pathPrefix
    ? sliced.filter((f) => f.path.startsWith(options.pathPrefix as string))
    : sliced;

  const files: ChangedFile[] = filtered.map((entry) => {
    const classification = classifyChangedFile(entry.path);
    const changeKind = statusCharToChangeKind(entry.status);
    const stats = numstat.get(entry.path) ?? { added: 0, removed: 0 };
    return {
      path: entry.path,
      ...(entry.oldPath !== undefined ? { oldPath: entry.oldPath } : {}),
      changeKind,
      metadataType: classification.metadataType,
      fullyQualifiedName: classification.fullyQualifiedName,
      category: classification.category,
      addedLines: stats.added,
      removedLines: stats.removed,
    };
  });

  return {
    fromRef: options.fromRef,
    toRef: options.toRef,
    generatedAt: new Date().toISOString(),
    files,
    totals: aggregateTotals(files),
    truncated,
  };
}

function aggregateTotals(files: readonly ChangedFile[]): RawDiff["totals"] {
  const byCategory: Record<DiffCategory, number> = {
    data_model: 0,
    automation: 0,
    permission: 0,
    ui: 0,
    logic: 0,
    operational: 0,
    manual: 0,
    unknown: 0,
  };
  const byChangeKind: Record<ChangeKind, number> = {
    added: 0,
    modified: 0,
    removed: 0,
    renamed: 0,
  };
  let added = 0;
  let removed = 0;
  for (const f of files) {
    byCategory[f.category] += 1;
    byChangeKind[f.changeKind] += 1;
    added += f.addedLines;
    removed += f.removedLines;
  }
  return {
    files: files.length,
    addedLines: added,
    removedLines: removed,
    byCategory,
    byChangeKind,
  };
}
