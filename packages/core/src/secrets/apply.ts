import type {
  CustomMetadataRecord,
  CustomMetadataValueInfo,
  KnowledgeGraph,
  ValidationRule,
} from "../types/graph.js";
import { maskContent } from "./mask.js";
import type { SecretRule } from "./rules.js";

/**
 * 知識グラフの「ユーザ入力由来の自由文」フィールドにマスキングを適用する。
 *
 * 対象 (= AI プロンプト / 生成 Markdown / SQLite に流れ、機密が紛れ得る箇所):
 *   - validationRules[].errorConditionFormula / errorMessage
 *   - customMetadataRecords[].values[].value / label
 *
 * 対象外 (= 構造的識別子。マスキングすると docs が破壊される):
 *   - fullyQualifiedName / sourcePath / contentHash / type / recordName
 *   - その他、Salesforce のメタデータ識別子
 *
 * Apex / Flow 等の body は将来的に対象に含める余地がある (v0.4.0+ で検討)。
 */
export function maskGraphSensitiveFields(
  graph: KnowledgeGraph,
  rules: readonly SecretRule[],
): KnowledgeGraph {
  if (rules.length === 0) return graph;

  const maybeMask = (value: string | undefined): string | undefined => {
    if (value === undefined || value === "") return value;
    return maskContent(value, rules).masked;
  };

  return {
    ...graph,
    validationRules: graph.validationRules.map(
      (vr): ValidationRule => ({
        ...vr,
        ...(vr.errorConditionFormula !== undefined && {
          errorConditionFormula: maybeMask(vr.errorConditionFormula),
        }),
        ...(vr.errorMessage !== undefined && {
          errorMessage: maybeMask(vr.errorMessage),
        }),
      }),
    ),
    customMetadataRecords: graph.customMetadataRecords.map(
      (cmr): CustomMetadataRecord => ({
        ...cmr,
        label: maybeMask(cmr.label),
        values: cmr.values.map(
          (v): CustomMetadataValueInfo => ({
            ...v,
            value: maskContent(v.value, rules).masked,
          }),
        ),
      }),
    ),
  };
}
