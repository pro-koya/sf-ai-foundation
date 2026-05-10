import { execFileSync } from "node:child_process";
import type { ChangeKind } from "./types.js";

export class GitInvocationError extends Error {
  readonly stderr: string;
  constructor(message: string, stderr: string) {
    super(message);
    this.name = "GitInvocationError";
    this.stderr = stderr;
  }
}

interface GitNameStatusEntry {
  readonly status: string;
  readonly path: string;
  readonly oldPath?: string;
}

export interface GitDiffResult {
  readonly files: readonly GitNameStatusEntry[];
  readonly numstat: ReadonlyMap<string, { readonly added: number; readonly removed: number }>;
}

export function runGit(args: readonly string[], cwd: string): string {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    const e = err as { stderr?: Buffer | string; message?: string };
    const stderr = typeof e.stderr === "string" ? e.stderr : (e.stderr?.toString() ?? "");
    throw new GitInvocationError(`git ${args.join(" ")} failed: ${e.message ?? ""}`.trim(), stderr);
  }
}

export function diffNameStatus(
  fromRef: string,
  toRef: string,
  cwd: string,
): readonly GitNameStatusEntry[] {
  const out = runGit(["diff", "--name-status", "-M", fromRef, toRef], cwd);
  const entries: GitNameStatusEntry[] = [];
  for (const rawLine of out.split("\n")) {
    const line = rawLine.trim();
    if (line === "") continue;
    const parts = line.split("\t");
    const status = parts[0] ?? "";
    if (status.startsWith("R") && parts.length >= 3) {
      const oldPath = parts[1];
      const path = parts[2];
      if (oldPath !== undefined && path !== undefined) {
        entries.push({ status: "R", path, oldPath });
      }
      continue;
    }
    if (parts.length >= 2) {
      const path = parts[1];
      if (path !== undefined) entries.push({ status, path });
    }
  }
  return entries;
}

export function diffNumstat(
  fromRef: string,
  toRef: string,
  cwd: string,
): ReadonlyMap<string, { readonly added: number; readonly removed: number }> {
  const out = runGit(["diff", "--numstat", "-M", fromRef, toRef], cwd);
  const result = new Map<string, { readonly added: number; readonly removed: number }>();
  for (const rawLine of out.split("\n")) {
    const line = rawLine.trim();
    if (line === "") continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const addedRaw = parts[0];
    const removedRaw = parts[1];
    const path = parts[2];
    if (addedRaw === undefined || removedRaw === undefined || path === undefined) continue;
    const added = addedRaw === "-" ? 0 : Number.parseInt(addedRaw, 10);
    const removed = removedRaw === "-" ? 0 : Number.parseInt(removedRaw, 10);
    if (Number.isNaN(added) || Number.isNaN(removed)) continue;
    result.set(path, { added, removed });
  }
  return result;
}

export function statusCharToChangeKind(status: string): ChangeKind {
  const ch = status.charAt(0).toUpperCase();
  if (ch === "A") return "added";
  if (ch === "D") return "removed";
  if (ch === "R") return "renamed";
  return "modified";
}

export function diffFiles(fromRef: string, toRef: string, cwd: string): GitDiffResult {
  return {
    files: diffNameStatus(fromRef, toRef, cwd),
    numstat: diffNumstat(fromRef, toRef, cwd),
  };
}
