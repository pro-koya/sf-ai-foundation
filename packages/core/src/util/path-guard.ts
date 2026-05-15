import { isAbsolute, relative, resolve } from "node:path";

export class PathGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathGuardError";
  }
}

/**
 * `inputPath` を `rootDir` 起点で解決し、解決後のパスが `rootDir` 配下に
 * 収まっていることを保証する。`../` による脱出を拒否する。
 *
 * 戻り値: 検証済みの絶対パス
 */
export function resolveWithinRoot(rootDir: string, inputPath: string, label = "path"): string {
  const root = resolve(rootDir);
  const resolved = resolve(root, inputPath);
  const rel = relative(root, resolved);
  if (rel === "" || rel === ".") {
    return resolved;
  }
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new PathGuardError(
      `${label} must be within ${root} (got: ${inputPath} → resolved outside root)`,
    );
  }
  return resolved;
}

/**
 * 既に解決された絶対パスが `rootDir` 配下にあることを assert する。
 * `resolveMarkdownPath` のような内部生成パス (FQN を組み込む) の検証用。
 */
export function assertWithinRoot(rootDir: string, resolvedPath: string, label = "path"): void {
  const root = resolve(rootDir);
  const target = resolve(resolvedPath);
  const rel = relative(root, target);
  if (rel === "" || rel === ".") return;
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new PathGuardError(`${label} escapes root ${root}: ${resolvedPath}`);
  }
}
