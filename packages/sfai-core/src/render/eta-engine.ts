import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Eta } from "eta";

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(here, "templates");

// autoTrim: false = タグ前後の改行を一切触らない (既存テンプレート / golden test を保護)。
// 結果として Markdown 表のヘッダ区切り行とデータ行の間に空行が入って表が崩れる現象は、
// 値レイヤではなく `postProcessMarkdown` で局所的に修正する (下記 renderEta 参照)。
const eta = new Eta({ views: TEMPLATE_DIR, autoTrim: false });

export function renderEta(templateFile: string, data: Record<string, unknown>): string {
  const path = resolve(TEMPLATE_DIR, templateFile);
  const source = readFileSync(path, "utf8");
  const raw = eta.renderString(source, data) ?? "";
  return postProcessMarkdown(raw);
}

/**
 * eta の autoTrim=false が原因で、テンプレート中の `<% ... %>` がループ等で空行を残し、
 * Markdown 表のヘッダ / 区切り / データ行の間に空行が入って GitHub レンダリング上で
 * 表が崩れる現象を、出力後に局所修正する。
 *
 * - 連続する Markdown 表行 (`| ... |`) の間に挟まる空行を 1 行以上検出したら 1 本に詰める
 * - 表以外の段落 / 見出し前後の空行は維持する (副作用ゼロ)
 * - 連続 3+ 空行は 2 行に圧縮 (読みやすさのみ目的、Markdown としての意味は変わらない)
 */
function postProcessMarkdown(text: string): string {
  // 表行のあとに空行を挟んで次の表行が来るパターン → 空行を全て削除
  let out = text;
  // ループで複数回適用 (隣接 3 行以上の表でも 1 回で全て詰める)
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(/(\|[^\n]*\|)\n(?:[ \t]*\n)+(\|[^\n]*\|)/g, "$1\n$2");
  }
  // 3 連続以上の空行を 2 つに圧縮 (装飾用)
  out = out.replace(/\n{4,}/g, "\n\n\n");
  return out;
}
