// マーカー仕様: <!-- {KIND}_{START|END} id="{block-id}" -->
// 詳細: .agents/knowledge/decisions/2026-05-07-human-managed-merge-algorithm.md

import type { BlockKind } from "../types/render.js";

export const BLOCK_KINDS = ["DETERMINISTIC", "AI_MANAGED", "HUMAN_MANAGED"] as const;
export type RawBlockKind = (typeof BLOCK_KINDS)[number];

export const MARKER_REGEX =
  /<!--\s*(DETERMINISTIC|AI_MANAGED|HUMAN_MANAGED)_(START|END)\s+id="([^"]+)"\s*-->/g;

export function rawToBlockKind(raw: RawBlockKind): BlockKind {
  switch (raw) {
    case "DETERMINISTIC":
      return "deterministic";
    case "AI_MANAGED":
      return "ai_managed";
    case "HUMAN_MANAGED":
      return "human_managed";
  }
}

export function blockKindToRaw(kind: BlockKind): RawBlockKind {
  switch (kind) {
    case "deterministic":
      return "DETERMINISTIC";
    case "ai_managed":
      return "AI_MANAGED";
    case "human_managed":
      return "HUMAN_MANAGED";
  }
}

export function buildMarker(kind: BlockKind, position: "start" | "end", id: string): string {
  const rawKind = blockKindToRaw(kind);
  const rawPosition = position === "start" ? "START" : "END";
  return `<!-- ${rawKind}_${rawPosition} id="${id}" -->`;
}
