import { createHash } from "node:crypto";

export function sha256(input: string | Buffer): string {
  return `sha256:${createHash("sha256").update(input).digest("hex")}`;
}

export function combineHashes(parts: readonly string[]): string {
  const hash = createHash("sha256");
  for (const part of parts.toSorted()) {
    hash.update(part);
    hash.update("\n");
  }
  return `sha256:${hash.digest("hex")}`;
}
