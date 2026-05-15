// Phase 5 中核型: persona 別オンボーディング

export type PersonaId = "new_joiner" | "reviewer" | "release_manager" | "customer_facing";

export type DepthMode =
  | "summary_first"
  | "detail_on_demand"
  | "checklist_first"
  | "business_impact_first";

export interface DomainDef {
  readonly id: string;
  readonly description: string;
  readonly primaryObjects: readonly string[];
  readonly keyDocs: readonly string[];
}

export interface PersonaDef {
  readonly goal: string;
  readonly readOrder: readonly string[];
  readonly depth: DepthMode;
  /** persona に対応する subagent 名 (scaffold/.claude/agents/<name>.md) */
  readonly primaryAgent?: string;
}

export interface ContextMap {
  readonly project: {
    readonly name: string;
    readonly domains: readonly DomainDef[];
  };
  readonly personas: Readonly<Record<PersonaId, PersonaDef>>;
}

export const PERSONA_IDS: readonly PersonaId[] = [
  "new_joiner",
  "reviewer",
  "release_manager",
  "customer_facing",
];

export interface PersonaState {
  readonly completedSteps: readonly string[];
  readonly currentStep: string | null;
  readonly viewedEntities: readonly string[];
  readonly questionsAsked: number;
  readonly startedAt: string;
  readonly lastUpdated: string;
}

export interface OnboardingStateFile {
  readonly version: 1;
  readonly lastUpdated: string;
  readonly personas: Readonly<Partial<Record<PersonaId, PersonaState>>>;
}

export const EMPTY_STATE: OnboardingStateFile = {
  version: 1,
  lastUpdated: "1970-01-01T00:00:00.000Z",
  personas: {},
};
