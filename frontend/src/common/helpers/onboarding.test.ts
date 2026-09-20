import { beforeEach, describe, expect, it, vi } from "vitest";

import config from "@/config/config";

import { getInitialOnboardingState, markOnboardingSeen } from "./onboarding";

const mocks = vi.hoisted(() => ({
  restRequest: vi.fn(() => Promise.resolve({})),
}));

vi.mock("./restRequest", () => ({
  restRequest: mocks.restRequest,
}));

describe("onboarding helper", () => {
  beforeEach(() => {
    mocks.restRequest.mockClear();
    mocks.restRequest.mockImplementation(() => Promise.resolve({}));
  });

  it("returns a copy of the localized onboarding state", () => {
    const state = getInitialOnboardingState();

    expect(state).toEqual(config.ONBOARDING);
    expect(state).not.toBe(config.ONBOARDING);
  });

  it("posts the flag as seen by default", async () => {
    await markOnboardingSeen("wizard");

    expect(mocks.restRequest).toHaveBeenCalledWith("onboarding", {
      method: "POST",
      body: { wizard: true },
    });
  });

  it("forwards an explicit seen value", async () => {
    await markOnboardingSeen("adminTour", false);

    expect(mocks.restRequest).toHaveBeenCalledWith("onboarding", {
      method: "POST",
      body: { adminTour: false },
    });
  });

  it("swallows write failures", async () => {
    mocks.restRequest.mockRejectedValueOnce(new Error("network"));

    await expect(markOnboardingSeen("wizard")).resolves.toBeUndefined();
  });
});
