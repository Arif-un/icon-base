import type * as ReactRouter from "@tanstack/react-router";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TOUR_ANCHOR } from "@/components/onboarding/tourSteps";

import { Route } from "./__root";

const mocks = vi.hoisted(() => ({
  initialState: { adminTour: true, editorGuide: true, version: 1, wizard: true },
  markOnboardingSeen: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/common/helpers/onboarding", () => ({
  getInitialOnboardingState: () => mocks.initialState,
  markOnboardingSeen: mocks.markOnboardingSeen,
}));

// The root layout is rendered outside a router here, so Link has no route context to
// resolve `to` against. Only the header's own markup is under test.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>();

  return {
    ...actual,
    Link: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
    Outlet: () => null,
  };
});

vi.mock("@/components/DevtoolsPortal", () => ({ DevtoolsPortal: () => null }));

const RootLayout = Route.options.component as ComponentType;

beforeEach(() => {
  // Everything already seen, so the wizard stays shut and the only "Take a tour" control
  // on screen is the header button.
  mocks.initialState = { adminTour: true, editorGuide: true, version: 1, wizard: true };
  mocks.markOnboardingSeen.mockClear();
});

describe("Root layout header", () => {
  /**
   * Regression: a conflict resolution against main dropped this button while leaving
   * useOnboarding() destructured, which lint caught. Losing it silently breaks the tour's
   * final step, whose target is this anchor, and the only way to replay the tour at all.
   */
  it("renders a Take a tour button carrying the tour anchor", () => {
    render(<RootLayout />);

    const button = screen.getByRole("button", { name: /take a tour/i });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-tour", TOUR_ANCHOR.tourButton);
  });

  it("opens the tour when the button is clicked", () => {
    render(<RootLayout />);

    fireEvent.click(screen.getByRole("button", { name: /take a tour/i }));

    expect(document.querySelector(".ant-tour")).not.toBeNull();
  });

  it("still renders the settings link alongside it", () => {
    render(<RootLayout />);

    expect(screen.getByLabelText("Settings")).toBeInTheDocument();
  });
});
