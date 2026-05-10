import type { MergeResult, MergeWarning, ParsedBlock } from "../types/render.js";
import { buildMarker } from "./markers.js";
import { findBlockById, parseDocument, replaceBlockContent } from "./parser.js";

export interface MergeOptions {
  readonly templatePath: string;
  readonly existingPath?: string;
}

export interface RenameOptions extends MergeOptions {
  readonly oldFilePath: string;
  readonly oldFileContent: string;
}

function selectHumanBlocks(blocks: readonly ParsedBlock[]): readonly ParsedBlock[] {
  return blocks.filter((b) => b.kind === "human_managed");
}

function selectAiBlocks(blocks: readonly ParsedBlock[]): readonly ParsedBlock[] {
  return blocks.filter((b) => b.kind === "ai_managed");
}

/**
 * Phase 8-A2: AI_MANAGED ブロックの内容が「テンプレ既定値から変化しているか」を判定する。
 * 変化していれば /sfai-explain によって書き換えられたと見做し、再描画で保全する。
 * 比較は前後空白を無視して厳密一致。
 */
function isCustomizedAiBlock(existingContent: string, templateContent: string): boolean {
  return existingContent.trim() !== templateContent.trim();
}

export function mergeRender(
  templateOutput: string,
  existingContent: string | undefined,
  options: MergeOptions,
): MergeResult {
  if (existingContent === undefined) {
    const templateDoc = parseDocument(options.templatePath, templateOutput);
    const humanCount = selectHumanBlocks(templateDoc.blocks).length;
    return {
      content: templateOutput,
      warnings: [],
      humanBlockCount: humanCount,
      preserved: false,
    };
  }

  const existingPath = options.existingPath ?? options.templatePath;
  const existingDoc = parseDocument(existingPath, existingContent);
  const templateDoc = parseDocument(options.templatePath, templateOutput);

  const existingHuman = selectHumanBlocks(existingDoc.blocks);
  const templateHuman = selectHumanBlocks(templateDoc.blocks);

  let merged = templateOutput;
  const warnings: MergeWarning[] = [];

  for (const tplBlock of templateHuman) {
    const matched = findBlockById(existingHuman, "human_managed", tplBlock.id);
    if (matched !== undefined) {
      merged = replaceBlockContent(merged, "human_managed", tplBlock.id, matched.content);
    } else {
      warnings.push({
        code: "human_block_missing",
        blockId: tplBlock.id,
        message: `HUMAN_MANAGED block "${tplBlock.id}" was missing in existing file. Re-inserted as empty.`,
      });
    }
  }

  for (const existingBlock of existingHuman) {
    const stillInTemplate = findBlockById(templateHuman, "human_managed", existingBlock.id);
    if (stillInTemplate === undefined) {
      warnings.push({
        code: "human_block_replaced_with_empty",
        blockId: existingBlock.id,
        message: `HUMAN_MANAGED block "${existingBlock.id}" exists in old file but not in new template; content discarded (consider --rename).`,
      });
    }
  }

  // Phase 8-A2: AI_MANAGED ブロックも customized なら保全する
  const existingAi = selectAiBlocks(existingDoc.blocks);
  const templateAi = selectAiBlocks(templateDoc.blocks);
  for (const tplBlock of templateAi) {
    const matched = findBlockById(existingAi, "ai_managed", tplBlock.id);
    if (matched !== undefined && isCustomizedAiBlock(matched.content, tplBlock.content)) {
      merged = replaceBlockContent(merged, "ai_managed", tplBlock.id, matched.content);
    }
  }

  return {
    content: merged,
    warnings,
    humanBlockCount: templateHuman.length,
    preserved: existingHuman.length > 0,
  };
}

function injectHumanBlock(target: string, block: ParsedBlock, originPath: string): string {
  const start = buildMarker("human_managed", "start", block.id);
  const end = buildMarker("human_managed", "end", block.id);
  const originComment = `<!-- HUMAN_MIGRATED_FROM: ${originPath} -->`;
  const injected = `\n\n${originComment}\n${start}${block.content}${end}\n`;
  return target.trimEnd() + injected;
}

export function mergeRenameAware(
  templateOutput: string,
  newPathExisting: string | undefined,
  oldFileContent: string,
  oldFilePath: string,
  options: MergeOptions,
): MergeResult {
  const baseResult = mergeRender(templateOutput, newPathExisting, options);
  const warnings: MergeWarning[] = [...baseResult.warnings];
  let content = baseResult.content;

  const oldDoc = parseDocument(oldFilePath, oldFileContent);
  const oldHuman = selectHumanBlocks(oldDoc.blocks);
  const currentDoc = parseDocument(options.templatePath, content);
  const currentHumanIds = new Set(selectHumanBlocks(currentDoc.blocks).map((b) => b.id));

  for (const oldBlock of oldHuman) {
    if (currentHumanIds.has(oldBlock.id)) {
      content = replaceBlockContent(content, "human_managed", oldBlock.id, oldBlock.content);
      warnings.push({
        code: "human_migrated_from_renamed_entity",
        blockId: oldBlock.id,
        originPath: oldFilePath,
        message: `Migrated HUMAN_MANAGED block "${oldBlock.id}" from ${oldFilePath}`,
      });
    } else {
      content = injectHumanBlock(content, oldBlock, oldFilePath);
      warnings.push({
        code: "human_migrated_from_renamed_entity",
        blockId: oldBlock.id,
        originPath: oldFilePath,
        message: `Injected orphan HUMAN_MANAGED block "${oldBlock.id}" from ${oldFilePath}`,
      });
    }
  }

  return {
    content,
    warnings,
    humanBlockCount: oldHuman.length + baseResult.humanBlockCount,
    preserved: true,
  };
}
