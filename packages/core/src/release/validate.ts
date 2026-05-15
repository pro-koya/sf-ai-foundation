import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import addFormats from "ajv-formats";
import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(here, "schema.json");

let cachedValidator: ReturnType<Ajv2020["compile"]> | undefined;

function loadValidator(): ReturnType<Ajv2020["compile"]> {
  if (cachedValidator !== undefined) return cachedValidator;
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as Record<string, unknown>;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

export class ReleaseDocValidationError extends Error {
  readonly errors: readonly ErrorObject[];
  constructor(errors: readonly ErrorObject[]) {
    super(`Release doc failed schema validation: ${errors.length} error(s)`);
    this.name = "ReleaseDocValidationError";
    this.errors = errors;
  }
}

export function validateReleaseDoc(data: unknown): void {
  const validator = loadValidator();
  if (!validator(data)) {
    throw new ReleaseDocValidationError(validator.errors ?? []);
  }
}

export function loadReleaseDocSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as Record<string, unknown>;
}
