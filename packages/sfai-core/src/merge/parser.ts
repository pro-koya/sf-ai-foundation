import type { BlockKind, ParsedBlock, ParsedDocument } from "../types/render.js";
import { MARKER_REGEX, type RawBlockKind, buildMarker, rawToBlockKind } from "./markers.js";
import { validateMarkers } from "./validator.js";

interface MarkerHit {
  readonly kind: RawBlockKind;
  readonly position: "START" | "END";
  readonly id: string;
  readonly start: number;
  readonly end: number;
}

function scanMarkers(content: string): readonly MarkerHit[] {
  const hits: MarkerHit[] = [];
  const regex = new RegExp(MARKER_REGEX.source, "g");
  let match: RegExpExecArray | null = regex.exec(content);
  while (match !== null) {
    const [matched, kind, position, id] = match;
    if (matched !== undefined && kind !== undefined && position !== undefined && id !== undefined) {
      hits.push({
        kind: kind as RawBlockKind,
        position: position as "START" | "END",
        id,
        start: match.index,
        end: match.index + matched.length,
      });
    }
    match = regex.exec(content);
  }
  return hits;
}

export function parseDocument(path: string, content: string): ParsedDocument {
  validateMarkers(content);
  const hits = scanMarkers(content);
  const blocks: ParsedBlock[] = [];

  for (let i = 0; i < hits.length; i += 2) {
    const start = hits[i];
    const end = hits[i + 1];
    if (start === undefined || end === undefined) continue;
    const inner = content.slice(start.end, end.start);
    blocks.push({
      kind: rawToBlockKind(start.kind),
      id: start.id,
      content: inner,
    });
  }

  const preludeBeforeFirstMarker =
    hits[0] !== undefined ? content.slice(0, hits[0].start) : content;
  const lastMarker = hits.at(-1);
  const tailAfterLastMarker = lastMarker !== undefined ? content.slice(lastMarker.end) : "";

  return {
    path,
    blocks,
    preludeBeforeFirstMarker,
    tailAfterLastMarker,
  };
}

export function findBlockById(
  blocks: readonly ParsedBlock[],
  kind: BlockKind,
  id: string,
): ParsedBlock | undefined {
  return blocks.find((b) => b.kind === kind && b.id === id);
}

export function replaceBlockContent(
  source: string,
  kind: BlockKind,
  id: string,
  newContent: string,
): string {
  const startMarker = buildMarker(kind, "start", id);
  const endMarker = buildMarker(kind, "end", id);
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) return source;
  const innerStart = startIdx + startMarker.length;
  const endIdx = source.indexOf(endMarker, innerStart);
  if (endIdx === -1) return source;
  return source.slice(0, innerStart) + newContent + source.slice(endIdx);
}
