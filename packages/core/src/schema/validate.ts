import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import addFormats from "ajv-formats";
import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(here, "graph.schema.json");

let cachedValidator: ReturnType<Ajv2020["compile"]> | undefined;

function loadValidator(): ReturnType<Ajv2020["compile"]> {
  if (cachedValidator !== undefined) return cachedValidator;
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as Record<string, unknown>;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

export class GraphSchemaValidationError extends Error {
  readonly errors: readonly ErrorObject[];
  constructor(errors: readonly ErrorObject[]) {
    const summary = errors
      .slice(0, 5)
      .map((e) => formatAjvError(e))
      .join("\n  - ");
    const truncated = errors.length > 5 ? `\n  ...and ${errors.length - 5} more` : "";
    super(
      `Knowledge graph failed schema validation: ${errors.length} error(s)\n  - ${summary}${truncated}`,
    );
    this.errors = errors;
    this.name = "GraphSchemaValidationError";
  }
}

function formatAjvError(err: ErrorObject): string {
  const path = err.instancePath !== "" ? err.instancePath : "(root)";
  const params =
    err.params !== undefined && Object.keys(err.params).length > 0
      ? ` [${Object.entries(err.params)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(", ")}]`
      : "";
  return `${path}: ${err.message ?? "validation failed"}${params}`;
}

export function validateGraph(data: unknown): void {
  const validator = loadValidator();
  if (!validator(data)) {
    throw new GraphSchemaValidationError(validator.errors ?? []);
  }
}

export function loadGraphSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as Record<string, unknown>;
}
