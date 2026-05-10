import type {
  ApprovalActionInfo,
  ApprovalCriterion,
  ApprovalIfNotMet,
  ApprovalProcess,
  ApprovalStepInfo,
} from "../../types/graph.js";
import { asArray, asBoolean, asString, parseXml } from "../parse-xml.js";
import type { ExtractContext } from "./types.js";

export function extractApprovalProcess({
  descriptor,
  content,
}: ExtractContext): ApprovalProcess | undefined {
  const root = parseXml(content);
  const node = (root.ApprovalProcess ?? {}) as Record<string, unknown>;

  // FQN は <Object>.<ProcessName>。Object 名は最初のドット以前。
  const dot = descriptor.fullyQualifiedName.indexOf(".");
  const object = dot > 0 ? descriptor.fullyQualifiedName.slice(0, dot) : descriptor.fullyQualifiedName;

  return {
    fullyQualifiedName: descriptor.fullyQualifiedName,
    object,
    label: asString(node.label),
    description: asString(node.description),
    active: asBoolean(node.active) ?? true,
    entryCriteria: extractCriteria(node.entryCriteria),
    steps: extractSteps(node),
    initialSubmissionActions: extractActions(node.initialSubmissionActions),
    finalApprovalActions: extractActions(node.finalApprovalActions),
    finalRejectionActions: extractActions(node.finalRejectionActions),
    recallActions: extractActions(node.recallActions),
    recordEditability: asString(node.recordEditability),
    sourcePath: descriptor.sourcePath,
    contentHash: descriptor.contentHash,
  };
}

function extractCriteria(node: unknown): readonly ApprovalCriterion[] {
  if (typeof node !== "object" || node === null) return [];
  const rec = node as Record<string, unknown>;
  const items = asArray(rec.criteriaItems as unknown);
  const result: ApprovalCriterion[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const field = asString(r.field);
    const operation = asString(r.operation);
    const value = asString(r.value) ?? "";
    if (field === undefined || operation === undefined) continue;
    result.push({ field, operation, value });
  }
  return result;
}

function extractSteps(node: Record<string, unknown>): readonly ApprovalStepInfo[] {
  const list = asArray(node.approvalStep as unknown);
  const out: ApprovalStepInfo[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const name = asString(r.name) ?? "";
    if (name === "") continue;
    const assigned = r.assignedApprover as Record<string, unknown> | undefined;
    const approverSpec = assigned?.approver as Record<string, unknown> | undefined;
    const approverType = asString(approverSpec?.type) ?? "Unknown";
    const approverDetail =
      asString(approverSpec?.field) ??
      asString(approverSpec?.queue) ??
      asString(approverSpec?.user) ??
      asString(approverSpec?.relatedUser) ??
      undefined;
    out.push({
      name,
      label: asString(r.label),
      description: asString(r.description),
      approverType,
      approverDetail,
      allowDelegate: asBoolean(r.allowDelegate) ?? false,
      ifCriteriaNotMet: normalizeIfNotMet(asString(r.ifCriteriaNotMet)),
      entryCriteria: extractCriteria(r.entryCriteria),
    });
  }
  return out;
}

function normalizeIfNotMet(value: string | undefined): ApprovalIfNotMet {
  switch (value) {
    case "ApproveRecord":
    case "RejectRequest":
    case "GoToNextStep":
      return value;
    default:
      return "Unknown";
  }
}

function extractActions(node: unknown): readonly ApprovalActionInfo[] {
  if (typeof node !== "object" || node === null) return [];
  const rec = node as Record<string, unknown>;
  const items = asArray(rec.action as unknown);
  const out: ApprovalActionInfo[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const name = asString(r.name) ?? "";
    const type = asString(r.type) ?? "Unknown";
    if (name === "") continue;
    out.push({ name, type });
  }
  return out;
}
