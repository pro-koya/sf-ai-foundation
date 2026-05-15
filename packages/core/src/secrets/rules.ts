// secrets-rules.yaml の最小スキーマ定義 + デフォルトルール
// 利用者はプロジェクトルートに `.yohaku/secrets-rules.yaml` を配置して上書きできる

export type SensitivityLevel = "public" | "internal" | "confidential" | "secret";

export interface SecretRule {
  readonly id: string;
  readonly description: string;
  readonly pattern: RegExp;
  readonly level: SensitivityLevel;
  readonly mask: "redact" | "hash" | "preserve";
}

export const DEFAULT_RULES: readonly SecretRule[] = [
  {
    id: "email-address",
    description: "メールアドレス (PII)",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    level: "confidential",
    mask: "hash",
  },
  {
    id: "salesforce-id-15",
    description: "Salesforce 15 文字 ID (内部識別子だが外部に出すと連鎖参照可能)",
    pattern: /\b00[A-Za-z0-9]{13}\b/g,
    level: "internal",
    mask: "preserve",
  },
  {
    id: "salesforce-id-18",
    description: "Salesforce 18 文字 ID",
    pattern: /\b00[A-Za-z0-9]{16}\b/g,
    level: "internal",
    mask: "preserve",
  },
  {
    id: "api-key-like",
    description: "API キーらしき長い英数字列",
    pattern: /\b[A-Za-z0-9_-]{32,}\b/g,
    level: "secret",
    mask: "redact",
  },
  {
    id: "phone-jp",
    description: "日本の電話番号らしき形式",
    pattern: /\b0\d{1,4}-\d{1,4}-\d{3,4}\b/g,
    level: "confidential",
    mask: "hash",
  },
  {
    id: "credit-card-like",
    description: "クレジットカード番号らしき 16 桁",
    pattern: /\b(?:\d[ -]*?){13,16}\b/g,
    level: "secret",
    mask: "redact",
  },
];
