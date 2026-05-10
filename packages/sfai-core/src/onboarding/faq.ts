// 対話ログから FAQ 候補を抽出
// PII マスキングは secrets/mask.ts の DEFAULT_RULES を再利用

import { maskContent } from "../secrets/mask.js";

export interface FaqCandidate {
  readonly question: string;
  readonly answer: string;
  readonly occurrences: number;
  readonly maskedQuestion: string;
  readonly maskedAnswer: string;
}

const QUESTION_PATTERNS: readonly RegExp[] = [
  /^(.{2,200}[?？])\s*$/m,
  /(.{2,150})(って何|とは|の使い方|の意味)\s*[?？]?\s*$/m,
];

interface ParsedExchange {
  readonly question: string;
  readonly answer: string;
}

/**
 * 対話ログ (Markdown 形式) からおおまかに Q/A ペアを抽出。
 * 区切り: 水平線 (---) または 行頭の見出し (#)
 */
export function parseDialogLog(content: string): readonly ParsedExchange[] {
  const sections = splitSections(content);
  const exchanges: ParsedExchange[] = [];
  for (const section of sections) {
    const paragraphs = section
      .split(/\n\s*\n/)
      .map((p) => stripLeadingHeading(p.trim()))
      .filter((p) => p !== "");
    const firstQuestionIdx = paragraphs.findIndex((p) => looksLikeQuestion(p));
    if (firstQuestionIdx === -1) continue;
    const question = paragraphs[firstQuestionIdx] ?? "";
    const answerParts = paragraphs.slice(firstQuestionIdx + 1);
    const answer = answerParts.join("\n\n").trim();
    if (answer === "") continue;
    exchanges.push({ question, answer });
  }
  return exchanges;
}

function splitSections(content: string): readonly string[] {
  const lines = content.split("\n");
  const sections: string[] = [];
  let buffer: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const isHeading = /^#{1,6}\s+/.test(trimmed);
    const isHr = /^(---+|\*\*\*+)$/.test(trimmed);
    if ((isHeading || isHr) && buffer.length > 0) {
      sections.push(buffer.join("\n"));
      buffer = [];
    }
    if (!isHr) {
      buffer.push(line);
    }
  }
  if (buffer.length > 0) sections.push(buffer.join("\n"));
  return sections;
}

function stripLeadingHeading(text: string): string {
  return text.replace(/^#{1,6}\s+/gm, "").trim();
}

function looksLikeQuestion(text: string): boolean {
  if (text.length < 3 || text.length > 500) return false;
  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/**
 * 質問の正規化キー (頻度集計用)。
 * 簡易: 末尾の ? / 句読点を除去、最初の 60 文字
 */
function normalizeKey(question: string): string {
  return question
    .replace(/[?？。、,.\s]+$/, "")
    .replace(/\s+/g, " ")
    .slice(0, 60)
    .toLowerCase();
}

export interface ExtractFaqOptions {
  readonly minOccurrences?: number;
  readonly maxItems?: number;
}

export function extractFaq(
  content: string,
  options: ExtractFaqOptions = {},
): readonly FaqCandidate[] {
  const minOcc = options.minOccurrences ?? 1;
  const maxItems = options.maxItems ?? 50;

  const exchanges = parseDialogLog(content);
  const counts = new Map<string, { count: number; sample: ParsedExchange }>();
  for (const ex of exchanges) {
    const key = normalizeKey(ex.question);
    if (key === "") continue;
    const existing = counts.get(key);
    if (existing === undefined) counts.set(key, { count: 1, sample: ex });
    else counts.set(key, { count: existing.count + 1, sample: existing.sample });
  }

  const candidates: FaqCandidate[] = [];
  for (const { count, sample } of counts.values()) {
    if (count < minOcc) continue;
    const maskedQ = maskContent(sample.question);
    const maskedA = maskContent(sample.answer);
    candidates.push({
      question: sample.question,
      answer: sample.answer,
      occurrences: count,
      maskedQuestion: maskedQ.masked,
      maskedAnswer: maskedA.masked,
    });
  }

  return candidates.toSorted((a, b) => b.occurrences - a.occurrences).slice(0, maxItems);
}

export function renderFaqMarkdown(topic: string, candidates: readonly FaqCandidate[]): string {
  const items = candidates
    .map((c) => {
      return [`### ${c.maskedQuestion} _(出現 ${c.occurrences} 回)_`, "", c.maskedAnswer].join(
        "\n",
      );
    })
    .join("\n\n");

  return [
    `# FAQ: ${topic}`,
    "",
    "> 自動抽出 (sfai onboard faq extract)。PII は secrets-rules.yaml に基づきマスキング済。",
    "",
    '<!-- AI_MANAGED_START id="extracted" -->',
    items === "" ? "(候補なし)" : items,
    '<!-- AI_MANAGED_END id="extracted" -->',
    "",
    '<!-- HUMAN_MANAGED_START id="curated" -->',
    "<!-- 人手で精査・編集した FAQ をここに記述。AI 上書きされません。 -->",
    '<!-- HUMAN_MANAGED_END id="curated" -->',
    "",
  ].join("\n");
}
