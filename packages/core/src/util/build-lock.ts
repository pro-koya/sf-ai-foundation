import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * 並行 graph build の競合を防ぐ簡易ロック。
 *
 * - `lockPath` (例: `.yohaku/build.lock`) が存在すれば、誰かが実行中。
 *   後続は `dirtyPath` (例: `.yohaku/build.dirty`) を touch して即終了する。
 * - 実行中プロセスは終了時にロックを解除し、dirty があれば 1 回だけ再実行する責任を持つ。
 *
 * SQLite WAL とプロセス間並行書き込みの組み合わせは壊れやすいので、
 * 「並行は絶対避ける、最後の編集だけは確実に反映」という戦略を取る。
 */

export interface BuildLockPaths {
  readonly lockPath: string;
  readonly dirtyPath: string;
}

export interface AcquireResult {
  readonly acquired: boolean;
  /** acquired=false の理由 ("locked") をログに出すための情報 */
  readonly heldBy?: string;
}

/**
 * ロックを取得試行する。取得できなければ dirty flag を立てて false を返す。
 */
export function tryAcquireBuildLock(paths: BuildLockPaths): AcquireResult {
  mkdirSync(dirname(paths.lockPath), { recursive: true });
  if (existsSync(paths.lockPath)) {
    // 別プロセスが実行中 — dirty flag を立てて即終了
    try {
      writeFileSync(paths.dirtyPath, new Date().toISOString(), { encoding: "utf8" });
    } catch {
      // ignore
    }
    let heldBy = "unknown";
    try {
      heldBy = readFileSync(paths.lockPath, "utf8").trim();
    } catch {
      // ignore
    }
    return { acquired: false, heldBy };
  }
  writeFileSync(paths.lockPath, `${process.pid}@${new Date().toISOString()}`, {
    encoding: "utf8",
  });
  return { acquired: true };
}

/**
 * ロックを解除し、dirty flag が立っていれば「再実行が必要」と通知する。
 */
export function releaseBuildLock(paths: BuildLockPaths): { readonly rerunNeeded: boolean } {
  try {
    rmSync(paths.lockPath, { force: true });
  } catch {
    // ignore
  }
  const rerunNeeded = existsSync(paths.dirtyPath);
  if (rerunNeeded) {
    try {
      rmSync(paths.dirtyPath, { force: true });
    } catch {
      // ignore
    }
  }
  return { rerunNeeded };
}

/**
 * 古い (stale) ロックを掃除する。OS リブートや SIGKILL でロックが残った場合の保険。
 * @param maxAgeMs これより古いロックは削除する (デフォルト 10 分)
 */
export function cleanStaleLock(paths: BuildLockPaths, maxAgeMs = 10 * 60 * 1000): void {
  if (!existsSync(paths.lockPath)) return;
  try {
    const content = readFileSync(paths.lockPath, "utf8");
    const isoMatch = content.match(/@(.+)$/);
    if (isoMatch) {
      const ts = Date.parse(isoMatch[1] ?? "");
      if (!Number.isNaN(ts) && Date.now() - ts > maxAgeMs) {
        rmSync(paths.lockPath, { force: true });
      }
    }
  } catch {
    // ignore
  }
}
