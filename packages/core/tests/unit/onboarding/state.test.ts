import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OnboardingStateStore } from "../../../src/onboarding/index.js";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "yohaku-state-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("OnboardingStateStore", () => {
  it("空ファイルなら EMPTY_STATE", () => {
    const store = new OnboardingStateStore({ rootPath: tmp });
    const s = store.read();
    expect(s.personas).toEqual({});
  });

  it("recordStep で persona ごとに進捗を記録", () => {
    const store = new OnboardingStateStore({ rootPath: tmp });
    store.recordStep("new_joiner", "overview");
    store.recordStep("new_joiner", "domain:sales", ["Account"]);
    const s = store.read();
    expect(s.personas.new_joiner?.completedSteps).toEqual(["overview", "domain:sales"]);
    expect(s.personas.new_joiner?.viewedEntities).toEqual(["Account"]);
    expect(s.personas.new_joiner?.currentStep).toBe("domain:sales");
  });

  it("incrementQuestions が累積", () => {
    const store = new OnboardingStateStore({ rootPath: tmp });
    store.recordStep("reviewer", "start");
    store.incrementQuestions("reviewer");
    store.incrementQuestions("reviewer", 3);
    const s = store.read();
    expect(s.personas.reviewer?.questionsAsked).toBe(4);
  });

  it("reset(persona) で 1 つだけ消す", () => {
    const store = new OnboardingStateStore({ rootPath: tmp });
    store.recordStep("new_joiner", "a");
    store.recordStep("reviewer", "b");
    store.reset("new_joiner");
    const s = store.read();
    expect(s.personas.new_joiner).toBeUndefined();
    expect(s.personas.reviewer).toBeDefined();
  });

  it("reset() で全消し", () => {
    const store = new OnboardingStateStore({ rootPath: tmp });
    store.recordStep("new_joiner", "a");
    store.reset();
    const s = store.read();
    expect(s.personas).toEqual({});
  });
});
