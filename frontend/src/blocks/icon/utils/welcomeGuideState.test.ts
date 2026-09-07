import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetWelcomeGuideLatch, shouldAutoOpenWelcomeGuide } from "./welcomeGuideState";

const mocks = vi.hoisted(() => ({
  state: { adminTour: false, editorGuide: false, version: 1, wizard: false },
}));

vi.mock("@/common/helpers/onboarding", () => ({
  getInitialOnboardingState: () => mocks.state,
}));

describe("shouldAutoOpenWelcomeGuide", () => {
  beforeEach(() => {
    mocks.state = { adminTour: false, editorGuide: false, version: 1, wizard: false };
    resetWelcomeGuideLatch();
  });

  it("opens once for a user who has not seen the guide", () => {
    expect(shouldAutoOpenWelcomeGuide()).toBe(true);
  });

  it("does not open again in the same session", () => {
    expect(shouldAutoOpenWelcomeGuide()).toBe(true);
    expect(shouldAutoOpenWelcomeGuide()).toBe(false);
    expect(shouldAutoOpenWelcomeGuide()).toBe(false);
  });

  it("never opens for a user who has already seen it", () => {
    mocks.state = { adminTour: false, editorGuide: true, version: 1, wizard: true };

    expect(shouldAutoOpenWelcomeGuide()).toBe(false);
  });
});
