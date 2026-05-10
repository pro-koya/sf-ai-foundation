import { lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ディレクトリを再帰的に走査してファイルを yield する。
 *
 * セキュリティ方針 (MED-4):
 *   - シンボリックリンクは **追跡しない** (lstatSync を使用)。
 *     `force-app/` 配下に外部ディレクトリへの symlink が置かれていても、
 *     プロジェクト外のファイルが知識グラフに混入することを防ぐ。
 */
export function* walkFiles(rootDir: string): Iterable<string> {
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry);
      let s: ReturnType<typeof lstatSync>;
      try {
        s = lstatSync(full);
      } catch {
        continue;
      }
      // シンボリックリンクは無視 (ファイル / ディレクトリ どちらでも)
      if (s.isSymbolicLink()) continue;
      if (s.isDirectory()) {
        stack.push(full);
      } else if (s.isFile()) {
        yield full;
      }
    }
  }
}
