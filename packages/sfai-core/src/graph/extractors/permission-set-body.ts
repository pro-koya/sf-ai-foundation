// PermissionSet 本体の権限抽出 (Phase 9-B4)
// XML から objectPermissions / fieldPermissions / classAccesses / userPermissions を取り出す。

import type {
  ClassAccessInfo,
  FieldPermissionInfo,
  ObjectPermissionInfo,
  PermissionSetBodyInfo,
} from "../../types/graph.js";
import { asArray, asBoolean, asString } from "../parse-xml.js";

export function extractPermissionSetBody(node: Record<string, unknown>): PermissionSetBodyInfo {
  return {
    objectPermissions: extractObjectPermissions(node),
    fieldPermissions: extractFieldPermissions(node),
    classAccesses: extractClassAccesses(node),
    userPermissions: extractUserPermissions(node),
  };
}

function extractObjectPermissions(node: Record<string, unknown>): readonly ObjectPermissionInfo[] {
  const list = asArray(node.objectPermissions as unknown);
  const result: ObjectPermissionInfo[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const object = asString(r.object);
    if (object === undefined) continue;
    result.push({
      object,
      create: asBoolean(r.allowCreate) ?? false,
      read: asBoolean(r.allowRead) ?? false,
      edit: asBoolean(r.allowEdit) ?? false,
      delete: asBoolean(r.allowDelete) ?? false,
      viewAll: asBoolean(r.viewAllRecords) ?? false,
      modifyAll: asBoolean(r.modifyAllRecords) ?? false,
    });
  }
  return result.toSorted((a, b) => a.object.localeCompare(b.object));
}

function extractFieldPermissions(node: Record<string, unknown>): readonly FieldPermissionInfo[] {
  const list = asArray(node.fieldPermissions as unknown);
  const result: FieldPermissionInfo[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const field = asString(r.field);
    if (field === undefined) continue;
    result.push({
      field,
      readable: asBoolean(r.readable) ?? false,
      editable: asBoolean(r.editable) ?? false,
    });
  }
  return result.toSorted((a, b) => a.field.localeCompare(b.field));
}

function extractClassAccesses(node: Record<string, unknown>): readonly ClassAccessInfo[] {
  const list = asArray(node.classAccesses as unknown);
  const result: ClassAccessInfo[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const apexClass = asString(r.apexClass);
    if (apexClass === undefined) continue;
    result.push({ apexClass, enabled: asBoolean(r.enabled) ?? false });
  }
  return result.toSorted((a, b) => a.apexClass.localeCompare(b.apexClass));
}

function extractUserPermissions(node: Record<string, unknown>): readonly string[] {
  const list = asArray(node.userPermissions as unknown);
  const result: string[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const name = asString(r.name);
    const enabled = asBoolean(r.enabled) ?? false;
    if (name !== undefined && enabled) result.push(name);
  }
  return result.toSorted((a, b) => a.localeCompare(b));
}
