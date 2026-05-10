import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  EMPTY_STATE,
  type OnboardingStateFile,
  type PersonaId,
  type PersonaState,
} from "./types.js";

const DEFAULT_PATH = ".sfai/onboarding-state.json";

export interface StateStoreOptions {
  readonly rootPath: string;
  readonly statePath?: string;
}

export class OnboardingStateStore {
  readonly #filePath: string;

  constructor(options: StateStoreOptions) {
    this.#filePath = resolve(options.rootPath, options.statePath ?? DEFAULT_PATH);
  }

  read(): OnboardingStateFile {
    if (!existsSync(this.#filePath)) return EMPTY_STATE;
    try {
      const raw = readFileSync(this.#filePath, "utf8");
      const parsed = JSON.parse(raw) as OnboardingStateFile;
      if (parsed.version === 1 && typeof parsed.personas === "object") return parsed;
      return EMPTY_STATE;
    } catch {
      return EMPTY_STATE;
    }
  }

  write(file: OnboardingStateFile): void {
    mkdirSync(dirname(this.#filePath), { recursive: true });
    writeFileSync(this.#filePath, `${JSON.stringify(file, null, 2)}\n`);
  }

  recordStep(
    persona: PersonaId,
    step: string,
    viewedEntities: readonly string[] = [],
  ): PersonaState {
    const current = this.read();
    const now = new Date().toISOString();
    const existing = current.personas[persona];
    const completedSteps = existing
      ? Array.from(new Set([...existing.completedSteps, step]))
      : [step];
    const mergedEntities = existing
      ? Array.from(new Set([...existing.viewedEntities, ...viewedEntities]))
      : viewedEntities;
    const personaState: PersonaState = {
      completedSteps,
      currentStep: step,
      viewedEntities: mergedEntities,
      questionsAsked: existing?.questionsAsked ?? 0,
      startedAt: existing?.startedAt ?? now,
      lastUpdated: now,
    };
    const next: OnboardingStateFile = {
      version: 1,
      lastUpdated: now,
      personas: { ...current.personas, [persona]: personaState },
    };
    this.write(next);
    return personaState;
  }

  incrementQuestions(persona: PersonaId, by = 1): PersonaState {
    const current = this.read();
    const now = new Date().toISOString();
    const existing = current.personas[persona] ?? {
      completedSteps: [],
      currentStep: null,
      viewedEntities: [],
      questionsAsked: 0,
      startedAt: now,
      lastUpdated: now,
    };
    const personaState: PersonaState = {
      ...existing,
      questionsAsked: existing.questionsAsked + by,
      lastUpdated: now,
    };
    this.write({
      version: 1,
      lastUpdated: now,
      personas: { ...current.personas, [persona]: personaState },
    });
    return personaState;
  }

  reset(persona?: PersonaId): void {
    if (persona === undefined) {
      this.write(EMPTY_STATE);
      return;
    }
    const current = this.read();
    const next = { ...current.personas } as Record<string, PersonaState>;
    delete next[persona];
    this.write({
      version: 1,
      lastUpdated: new Date().toISOString(),
      personas: next as OnboardingStateFile["personas"],
    });
  }
}
