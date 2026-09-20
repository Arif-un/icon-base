import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OnboardingProvider } from "./OnboardingProvider";
import WelcomeWizard from "./WelcomeWizard";

const mocks = vi.hoisted(() => ({
  initialState: { adminTour: false, editorGuide: false, version: 1, wizard: false },
  markOnboardingSeen: vi.fn(() => Promise.resolve()),
  assign: vi.fn(),
}));

vi.mock("@/common/helpers/onboarding", () => ({
  getInitialOnboardingState: () => mocks.initialState,
  markOnboardingSeen: mocks.markOnboardingSeen,
}));

vi.mock("@/config/config", () => ({
  default: { NEW_POST_URL: "https://example.test/post-new.php" },
}));

function renderWizard() {
  return render(
    <OnboardingProvider>
      <WelcomeWizard />
    </OnboardingProvider>,
  );
}

describe("WelcomeWizard", () => {
  beforeEach(() => {
    mocks.markOnboardingSeen.mockClear();
    mocks.assign.mockClear();
    vi.stubGlobal("location", { assign: mocks.assign });
  });

  it("opens on the first step", () => {
    renderWizard();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/bundles more than 4,500 SVG icons/)).toBeInTheDocument();
  });

  it("walks forward and back through the steps", () => {
    renderWizard();

    // No Back button on the first step.
    expect(screen.queryByText("Back")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/Search runs against both icon names/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText(/bundles more than 4,500 SVG icons/)).toBeInTheDocument();
  });

  it("shows the tour and create CTAs on the final step", () => {
    renderWizard();

    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Take a tour")).toBeInTheDocument();
    expect(screen.getByText("Create a new post")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("navigates to a new post after persisting the wizard", async () => {
    renderWizard();

    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Create a new post"));

    // createPost awaits the write before navigating.
    await vi.waitFor(() => {
      expect(mocks.assign).toHaveBeenCalledWith("https://example.test/post-new.php");
    });
    expect(mocks.markOnboardingSeen).toHaveBeenCalledWith("wizard");
  });

  it("closes when skipped", () => {
    renderWizard();

    fireEvent.click(screen.getByText("Skip"));

    expect(mocks.markOnboardingSeen).toHaveBeenCalledWith("wizard");
  });
});
