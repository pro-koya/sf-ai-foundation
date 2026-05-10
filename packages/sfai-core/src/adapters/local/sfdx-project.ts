// sfdx-project.json の最小読み取り
// 仕様: https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface PackageDirectory {
  readonly path: string;
  readonly default: boolean;
}

export interface SfdxProjectConfig {
  readonly packageDirectories: readonly PackageDirectory[];
  readonly sourceApiVersion?: string;
  readonly namespace?: string;
}

const DEFAULT_PACKAGE_DIRECTORIES: readonly PackageDirectory[] = [
  { path: "force-app", default: true },
];

export class SfdxProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SfdxProjectError";
  }
}

export function readSfdxProject(rootPath: string): SfdxProjectConfig {
  const path = join(rootPath, "sfdx-project.json");
  if (!existsSync(path)) {
    return { packageDirectories: DEFAULT_PACKAGE_DIRECTORIES };
  }

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new SfdxProjectError(`Failed to read sfdx-project.json: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new SfdxProjectError(`sfdx-project.json is not valid JSON: ${(err as Error).message}`);
  }

  return normalizeConfig(parsed);
}

function normalizeConfig(parsed: unknown): SfdxProjectConfig {
  if (parsed === null || typeof parsed !== "object") {
    throw new SfdxProjectError("sfdx-project.json must be a JSON object");
  }
  const obj = parsed as Record<string, unknown>;
  const rawDirs = obj.packageDirectories;
  const packageDirectories = normalizePackageDirectories(rawDirs);

  return {
    packageDirectories,
    sourceApiVersion: typeof obj.sourceApiVersion === "string" ? obj.sourceApiVersion : undefined,
    namespace: typeof obj.namespace === "string" ? obj.namespace : undefined,
  };
}

function normalizePackageDirectories(value: unknown): readonly PackageDirectory[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_PACKAGE_DIRECTORIES;
  }
  const dirs: PackageDirectory[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.path !== "string") continue;
    dirs.push({
      path: e.path,
      default: e.default === true,
    });
  }
  if (dirs.length === 0) return DEFAULT_PACKAGE_DIRECTORIES;
  if (!dirs.some((d) => d.default)) {
    const firstDir = dirs[0];
    if (firstDir !== undefined) {
      const promoted: PackageDirectory = { path: firstDir.path, default: true };
      const tail = dirs.slice(1);
      return [promoted, ...tail];
    }
  }
  return dirs;
}
