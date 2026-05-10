import type { ValidationRule } from "../../types/graph.js";
import { asBoolean, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractValidationRule({
  descriptor,
  content,
}: ExtractContext): ValidationRule | undefined {
  const root = parseXml(content);
  const node = (root.ValidationRule ?? {}) as Record<string, unknown>;
  const [object] = descriptor.fullyQualifiedName.split(".");
  if (object === undefined) return undefined;
  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    object,
    active: asBoolean(node.active) ?? true,
    errorConditionFormula: asString(node.errorConditionFormula),
    errorMessage: asString(node.errorMessage),
    errorDisplayField: asString(node.errorDisplayField),
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}
