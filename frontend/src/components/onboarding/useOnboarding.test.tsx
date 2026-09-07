import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingProvider } from "./OnboardingProvider";
import { useOnboarding } from "./useOnboarding";

const mocks = vi.hoisted(() => ({
  initialState: { adminTour: false, editorGuide: false, version: 1, wizard: false },
  markOnboardingSeen: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/common/helpers/onboarding", () => ({
  getInitialOnboardingState: () => mocks.initialState,
  markOnboardingSeen: mocks.markOnboardingSeen,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}

describe("useOnboarding", () => {
  beforeEach(() => {
    mocks.initialState = { adminTour: false, editorGuide: false, version: 1, wizard: false };
    mocks.markOnboardingSeen.mockClear();
  });

  it("throws outside of a provider", () => {
    expect(() => renderHook(() => useOnboarding())).toThrow(/OnboardingProvider/);
  });

  it("opens the wizard when the user has not seen it", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.isWizardOpen).toBe(true);
    expect(result.current.isTourOpen).toBe(false);
  });

  it("stays closed when the user has already seen the wizard", () => {
    mocks.initialState = { adminTour: true, editorGuide: true, version: 1, wizard: true };

    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.isWizardOpen).toBe(false);
  });

  it("persists the wizard as seen when dismissed", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.closeWizard();
    });

    expect(result.current.isWizardOpen).toBe(false);
    expect(mocks.markOnboardingSeen).toHaveBeenCalledWith("wizard");
  });

  it("swaps the wizard for the tour and marks the wizard seen", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.startTour();
    });

    expect(result.current.isWizardOpen).toBe(false);
    expect(result.current.isTourOpen).toBe(true);
    expect(mocks.markOnboardingSeen).toHaveBeenCalledWith("wizard");
  });

  it("persists the tour as seen when it ends", () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.startTour();
    });
    act(() => {
      result.current.endTour();
    });

    expect(result.current.isTourOpen).toBe(false);
    expect(mocks.markOnboardingSeen).toHaveBeenCalledWith("adminTour");
  });

  it("writes before closing when finishing, so navigation cannot race the request", async () => {
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    let resolveWrite!: () => void;
    const pendingWrite = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    mocks.markOnboardingSeen.mockImplementationOnce(() => pendingWrite);

    await act(async () => {
      const finishing = result.current.finishWizard();

      // Still open: the write has not settled yet.
      expect(result.current.isWizardOpen).toBe(true);

      resolveWrite();
      await finishing;
    });

    expect(mocks.markOnboardingSeen).toHaveBeenCalledWith("wizard");
    expect(result.current.isWizardOpen).toBe(false);
  });
});
