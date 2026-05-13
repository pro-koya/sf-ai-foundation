// 変更ファイルのメタデータ型 / FQN / カテゴリを決定的に推論
// AI 推測は使わない (3-3 以降の subagent が業務影響を意味づけする)

import type { DiffCategory } from "./types.js";

interface MetadataClassification {
  readonly metadataType: string | null;
  readonly fullyQualifiedName: string | null;
  readonly category: DiffCategory;
}

interface ExtensionRule {
  readonly suffix: string;
  readonly metadataType: string;
  readonly category: DiffCategory;
}

const EXTENSION_RULES: readonly ExtensionRule[] = [
  { suffix: ".object-meta.xml", metadataType: "CustomObject", category: "data_model" },
  { suffix: ".field-meta.xml", metadataType: "CustomField", category: "data_model" },
  {
    suffix: ".validationRule-meta.xml",
    metadataType: "ValidationRule",
    category: "data_model",
  },
  { suffix: ".recordType-meta.xml", metadataType: "RecordType", category: "data_model" },
  { suffix: ".flow-meta.xml", metadataType: "Flow", category: "automation" },
  { suffix: ".cls", metadataType: "ApexClass", category: "logic" },
  { suffix: ".trigger", metadataType: "ApexTrigger", category: "automation" },
  { suffix: ".permissionset-meta.xml", metadataType: "PermissionSet", category: "permission" },
  { suffix: ".profile-meta.xml", metadataType: "Profile", category: "permission" },
  {
    suffix: ".permissionsetgroup-meta.xml",
    metadataType: "PermissionSetGroup",
    category: "permission",
  },
  { suffix: ".sharingRules-meta.xml", metadataType: "SharingRules", category: "permission" },
  { suffix: ".layout-meta.xml", metadataType: "Layout", category: "ui" },
  { suffix: ".flexipage-meta.xml", metadataType: "FlexiPage", category: "ui" },
  { suffix: ".js-meta.xml", metadataType: "LightningComponentBundle", category: "ui" },
  {
    suffix: ".tab-meta.xml",
    metadataType: "CustomTab",
    category: "ui",
  },
  { suffix: ".app-meta.xml", metadataType: "CustomApplication", category: "ui" },
];

const META_XML_EXCLUSIONS: readonly string[] = [".cls-meta.xml", ".trigger-meta.xml"];

export function classifyChangedFile(path: string): MetadataClassification {
  // Windows 互換: git diff は通常 forward slash を返すが、防御的に両方受け入れる
  const fileName = path.split(/[/\\]/).at(-1) ?? "";

  // .cls-meta.xml / .trigger-meta.xml はサイドカーで本体ではない
  for (const exclusion of META_XML_EXCLUSIONS) {
    if (fileName.endsWith(exclusion)) {
      return { metadataType: null, fullyQualifiedName: null, category: "operational" };
    }
  }

  for (const rule of EXTENSION_RULES) {
    if (!fileName.endsWith(rule.suffix)) continue;
    const fqn = inferFqn(rule.metadataType, path, fileName);
    return { metadataType: rule.metadataType, fullyQualifiedName: fqn, category: rule.category };
  }

  return { metadataType: null, fullyQualifiedName: null, category: "unknown" };
}

function inferFqn(metadataType: string, path: string, fileName: string): string | null {
  // Windows 互換: パス区切りは / または \ どちらでも
  const segments = path.split(/[/\\]/);
  switch (metadataType) {
    case "CustomObject":
      return removeSuffix(fileName, ".object-meta.xml");
    case "CustomField":
    case "ValidationRule":
    case "RecordType": {
      const idx = segments.indexOf("objects");
      const objectName = idx >= 0 ? segments[idx + 1] : undefined;
      if (objectName === undefined) return null;
      const suffix =
        metadataType === "CustomField"
          ? ".field-meta.xml"
          : metadataType === "ValidationRule"
            ? ".validationRule-meta.xml"
            : ".recordType-meta.xml";
      return `${objectName}.${removeSuffix(fileName, suffix)}`;
    }
    case "Flow":
      return removeSuffix(fileName, ".flow-meta.xml");
    case "ApexClass":
      return removeSuffix(fileName, ".cls");
    case "ApexTrigger":
      return removeSuffix(fileName, ".trigger");
    case "PermissionSet":
      return removeSuffix(fileName, ".permissionset-meta.xml");
    case "PermissionSetGroup":
      return removeSuffix(fileName, ".permissionsetgroup-meta.xml");
    case "Profile":
      return removeSuffix(fileName, ".profile-meta.xml");
    case "SharingRules":
      return removeSuffix(fileName, ".sharingRules-meta.xml");
    case "Layout":
      return removeSuffix(fileName, ".layout-meta.xml");
    case "FlexiPage":
      return removeSuffix(fileName, ".flexipage-meta.xml");
    case "LightningComponentBundle": {
      // lwc/<name>/<name>.js-meta.xml
      const lwcIdx = segments.indexOf("lwc");
      return lwcIdx >= 0 ? (segments[lwcIdx + 1] ?? null) : null;
    }
    case "CustomTab":
      return removeSuffix(fileName, ".tab-meta.xml");
    case "CustomApplication":
      return removeSuffix(fileName, ".app-meta.xml");
    default:
      return null;
  }
}

function removeSuffix(s: string, suffix: string): string {
  return s.endsWith(suffix) ? s.slice(0, -suffix.length) : s;
}
