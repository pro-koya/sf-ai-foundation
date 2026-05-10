// 再現性ガバナンス層 4: 一致率 CI
// AI 出力を temperature=0 / 同一プロンプトハッシュ / 同一入力で N 回再実行し、
// 完全一致率と JSON Schema 適合率を計測する。

export interface ConsistencyOptions<T> {
  /** AI 呼び出しなど 1 回分の出力を返す関数 */
  readonly producer: () => Promise<T>;
  /** 再実行回数 (Phase 3 では 5 を推奨) */
  readonly runs: number;
  /** 出力の構造的検証 (例: ajv 適合チェック)。true を返した出力のみが exactMatch 計算に進む */
  readonly validate?: (output: unknown) => boolean;
  /** 出力をハッシュ可能な canonical 形式に正規化 */
  readonly canonicalize?: (output: T) => string;
}

export interface ConsistencyResult<T> {
  readonly runs: number;
  readonly outputs: readonly T[];
  readonly schemaConformanceRate: number;
  readonly exactMatchRate: number;
  /** 最頻値 (canonical 比較で多数決) */
  readonly modal?: T;
  /** 各実行の canonical hash */
  readonly hashes: readonly string[];
}

export interface ExpectMatchOptions {
  readonly minExactMatchRate?: number;
  readonly minSchemaConformance?: number;
}

export class ConsistencyAssertionError extends Error {
  readonly result: ConsistencyResult<unknown>;
  constructor(message: string, result: ConsistencyResult<unknown>) {
    super(message);
    this.name = "ConsistencyAssertionError";
    this.result = result;
  }
}
