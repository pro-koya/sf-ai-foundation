import type { ApexTrigger, Dependency, Field, Flow } from "../types/graph.js";

export function deriveFieldDependencies(fields: readonly Field[]): readonly Dependency[] {
  const deps: Dependency[] = [];
  for (const field of fields) {
    if (field.referenceTo === undefined) continue;
    for (const target of field.referenceTo) {
      deps.push({
        from: { kind: "field", fullyQualifiedName: field.fullyQualifiedName },
        to: { kind: "object", fullyQualifiedName: target },
        kind: "references",
        evidencePath: field.sourcePath,
      });
    }
  }
  return deps;
}

export function deriveTriggerDependencies(triggers: readonly ApexTrigger[]): readonly Dependency[] {
  return triggers.map((t) => ({
    from: { kind: "apexTrigger", fullyQualifiedName: t.fullyQualifiedName },
    to: { kind: "object", fullyQualifiedName: t.object },
    kind: "triggers" as const,
    evidencePath: t.sourcePath,
  }));
}

export function deriveFlowDependencies(flows: readonly Flow[]): readonly Dependency[] {
  return flows
    .filter((f) => f.triggeringObject !== undefined)
    .map((f) => ({
      from: { kind: "flow" as const, fullyQualifiedName: f.fullyQualifiedName },
      to: {
        kind: "object" as const,
        fullyQualifiedName: f.triggeringObject as string,
      },
      kind: "triggers" as const,
      evidencePath: f.sourcePath,
    }));
}
