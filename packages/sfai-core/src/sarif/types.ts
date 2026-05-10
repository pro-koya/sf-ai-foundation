// SARIF 2.1.0 のうち Code Analyzer v5 が出力する範囲のサブセット
// 仕様: https://docs.oasis-open.org/sarif/sarif/v2.1.0/

export type SarifLevel = "none" | "note" | "warning" | "error";

export interface SarifMessage {
  readonly text?: string;
}

export interface SarifLocation {
  readonly physicalLocation?: {
    readonly artifactLocation?: {
      readonly uri?: string;
    };
    readonly region?: {
      readonly startLine?: number;
      readonly endLine?: number;
    };
  };
}

export interface SarifResult {
  readonly ruleId?: string;
  readonly level?: SarifLevel;
  readonly message?: SarifMessage;
  readonly locations?: readonly SarifLocation[];
}

export interface SarifRun {
  readonly results?: readonly SarifResult[];
  readonly tool?: {
    readonly driver?: {
      readonly name?: string;
    };
  };
}

export interface SarifLog {
  readonly version?: string;
  readonly $schema?: string;
  readonly runs?: readonly SarifRun[];
}

/** 本 OSS 内部表現 (change-summary 互換) */
export interface NormalizedFinding {
  readonly ruleId: string;
  readonly level: SarifLevel;
  readonly message: string;
  readonly locations: readonly string[];
  readonly tool?: string;
}
