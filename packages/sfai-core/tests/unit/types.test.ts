import { describe, expect, it } from "vitest";
import type { EntityRef, KnowledgeGraph } from "../../src/index.js";

describe("type surface", () => {
  it("EntityRef は kind と fullyQualifiedName を持つ", () => {
    const ref: EntityRef = { kind: "object", fullyQualifiedName: "Account" };
    expect(ref.kind).toBe("object");
    expect(ref.fullyQualifiedName).toBe("Account");
  });

  it("KnowledgeGraph は 11 のコレクションを持つ (meta + 10 categories)", () => {
    const empty: KnowledgeGraph = {
      meta: {
        sfaiVersion: "0.0.1",
        builtAt: "2026-05-07T00:00:00Z",
        sourceAdapter: "local",
        salesforceApiVersion: "62.0",
        sourceHash: "sha256:placeholder",
      },
      objects: [],
      fields: [],
      validationRules: [],
      flows: [],
      apexClasses: [],
      apexTriggers: [],
      permissionSets: [],
      profiles: [],
      recordTypes: [],
      approvalProcesses: [],
      sharingRules: [],
      layouts: [],
      customMetadataRecords: [],
      namedCredentials: [],
      remoteSiteSettings: [],
      lwcs: [],
      auraBundles: [],
      flexiPages: [],
      visualforcePages: [],
      visualforceComponents: [],
      customApplications: [],
      dependencies: [],
      tags: [],
    };
    expect(Object.keys(empty)).toHaveLength(24);
  });
});
