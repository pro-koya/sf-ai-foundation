import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanStaleLock,
  releaseBuildLock,
  tryAcquireBuildLock,
} from "../../../src/util/build-lock.js";

describe("build-lock", () => {
  let dir: string;
  let lockPath: string;
  let dirtyPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "yohaku-lock-"));
    lockPath = join(dir, ".yohaku", "build.lock");
    dirtyPath = join(dir, ".yohaku", "build.dirty");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("first acquire succeeds", () => {
    const r = tryAcquireBuildLock({ lockPath, dirtyPath });
    expect(r.acquired).toBe(true);
    expect(existsSync(lockPath)).toBe(true);
  });

  it("second concurrent acquire fails and sets dirty flag", () => {
    tryAcquireBuildLock({ lockPath, dirtyPath });
    const second = tryAcquireBuildLock({ lockPath, dirtyPath });
    expect(second.acquired).toBe(false);
    expect(existsSync(dirtyPath)).toBe(true);
  });

  it("release without dirty returns rerunNeeded=false", () => {
    tryAcquireBuildLock({ lockPath, dirtyPath });
    const r = releaseBuildLock({ lockPath, dirtyPath });
    expect(r.rerunNeeded).toBe(false);
    expect(existsSync(lockPath)).toBe(false);
  });

  it("release with dirty returns rerunNeeded=true and clears dirty", () => {
    tryAcquireBuildLock({ lockPath, dirtyPath });
    tryAcquireBuildLock({ lockPath, dirtyPath }); // sets dirty
    const r = releaseBuildLock({ lockPath, dirtyPath });
    expect(r.rerunNeeded).toBe(true);
    expect(existsSync(dirtyPath)).toBe(false);
  });

  it("cleanStaleLock removes locks older than maxAgeMs", () => {
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, `99999@${new Date(Date.now() - 60_000).toISOString()}`);
    cleanStaleLock({ lockPath, dirtyPath }, 1000);
    expect(existsSync(lockPath)).toBe(false);
  });

  it("cleanStaleLock keeps fresh locks", () => {
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, `${process.pid}@${new Date().toISOString()}`);
    cleanStaleLock({ lockPath, dirtyPath }, 60_000);
    expect(existsSync(lockPath)).toBe(true);
  });

  it("heldBy is reported when lock acquisition fails", () => {
    const first = tryAcquireBuildLock({ lockPath, dirtyPath });
    expect(first.acquired).toBe(true);
    const second = tryAcquireBuildLock({ lockPath, dirtyPath });
    expect(second.acquired).toBe(false);
    expect(second.heldBy).toMatch(/^\d+@/); // pid@iso
    const content = readFileSync(lockPath, "utf8");
    expect(second.heldBy).toBe(content.trim());
  });
});
