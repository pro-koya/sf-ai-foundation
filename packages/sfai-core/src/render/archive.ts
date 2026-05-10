// docs/generated/_archive/<YYYY-MM-DD>/<original-relative-path> を計算
// 物理移動 (fs) は CLI 層が担当する。本関数は純粋にパスのみを返す。

const GENERATED_PREFIX = "docs/generated/";

export function archiveDeleted(
  existingPath: string,
  archiveBaseDir: string,
  renderDate: string,
): string {
  const normalizedDate = renderDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error(`renderDate must be ISO date (YYYY-MM-DD): ${renderDate}`);
  }

  const baseNormalized = archiveBaseDir.replace(/\/$/, "");
  const relative = stripGeneratedPrefix(existingPath, baseNormalized);
  return `${baseNormalized}/${normalizedDate}/${relative}`;
}

function stripGeneratedPrefix(path: string, archiveBaseDir: string): string {
  // ケース 1: 相対パス "docs/generated/objects/Account.md"
  if (path.startsWith(GENERATED_PREFIX)) {
    return path.slice(GENERATED_PREFIX.length);
  }
  // ケース 2: archiveBaseDir が ".../docs/generated/_archive" のような絶対パスで、
  // existingPath が同じ docs/generated/ 配下にある場合 → 該当部分以降を切り出す
  const baseNoTrailing = archiveBaseDir.replace(/\/$/, "");
  // archiveBaseDir の末尾の "/_archive" を取り除いた = docs/generated/ root
  if (baseNoTrailing.endsWith("/_archive")) {
    const generatedRoot = `${baseNoTrailing.slice(0, -"_archive".length)}`;
    if (path.startsWith(generatedRoot)) {
      return path.slice(generatedRoot.length);
    }
  }
  // 兜のフォールバック: 最後のセグメントだけ返す (深い階層を作らない)
  return path.split("/").at(-1) ?? path;
}
