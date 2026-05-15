import { MARKER_REGEX, type RawBlockKind } from "./markers.js";

export class MarkerCorruptionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "MarkerCorruptionError";
  }
}

interface MarkerToken {
  readonly kind: RawBlockKind;
  readonly position: "START" | "END";
  readonly id: string;
  readonly index: number;
}

export function tokenizeMarkers(content: string): readonly MarkerToken[] {
  const tokens: MarkerToken[] = [];
  const regex = new RegExp(MARKER_REGEX.source, "g");
  let match: RegExpExecArray | null = regex.exec(content);
  while (match !== null) {
    const [, kind, position, id] = match;
    if (!kind || !position || !id) {
      throw new MarkerCorruptionError(
        "id_attribute_missing",
        `Marker without complete id at index ${match.index}`,
      );
    }
    tokens.push({
      kind: kind as RawBlockKind,
      position: position as "START" | "END",
      id,
      index: match.index,
    });
    match = regex.exec(content);
  }
  return tokens;
}

export function validateMarkers(content: string): void {
  const tokens = tokenizeMarkers(content);
  if (tokens.length === 0) return;

  const stack: MarkerToken[] = [];
  const seenIds = new Set<string>();

  for (const token of tokens) {
    if (token.position === "START") {
      if (seenIds.has(`${token.kind}:${token.id}`)) {
        throw new MarkerCorruptionError(
          "duplicate_id",
          `Duplicate marker id "${token.id}" for kind ${token.kind}`,
        );
      }
      seenIds.add(`${token.kind}:${token.id}`);
      const top = stack.at(-1);
      if (top !== undefined) {
        throw new MarkerCorruptionError(
          "nested_markers",
          `Nested markers detected: "${top.kind}:${top.id}" contains "${token.kind}:${token.id}"`,
        );
      }
      stack.push(token);
    } else {
      const top = stack.pop();
      if (top === undefined) {
        throw new MarkerCorruptionError(
          "orphan_end_marker",
          `END marker without START: ${token.kind}:${token.id}`,
        );
      }
      if (top.kind !== token.kind || top.id !== token.id) {
        throw new MarkerCorruptionError(
          "marker_mismatch",
          `START "${top.kind}:${top.id}" does not match END "${token.kind}:${token.id}"`,
        );
      }
    }
  }

  if (stack.length > 0) {
    const top = stack[0];
    if (top !== undefined) {
      throw new MarkerCorruptionError(
        "orphan_start_marker",
        `START marker without END: ${top.kind}:${top.id}`,
      );
    }
  }
}
