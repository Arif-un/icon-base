import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminTour from "./AdminTour";

const mocks = vi.hoisted(() => ({
  isTourOpen: true,
  endTour: vi.fn(),
  shadowRoot: undefined as { querySelector: ReturnType<typeof vi.fn> } | undefined,
}));

vi.mock("./useOnboarding", () => ({
  useOnboarding: () => ({ isTourOpen: mocks.isTourOpen, endTour: mocks.endTour }),
}));

vi.mock("@/bootstrap/createReactShadow", () => ({
  useShadowRoot: () => mocks.shadowRoot,
}));

describe("AdminTour", () => {
  beforeEach(() => {
    mocks.isTourOpen = true;
    mocks.endTour.mockClear();
    mocks.shadowRoot = undefined;
  });

  it("portals into the app root inside the shadow root when present", () => {
    const appRoot = document.createElement("div");
    const querySelector = vi.fn(() => appRoot);
    mocks.shadowRoot = { querySelector };

    render(<AdminTour />);

    expect(querySelector).toHaveBeenCalledWith("[data-app-root]");
  });

  it("renders without a shadow root, falling back to document.body", () => {
    mocks.shadowRoot = undefined;

    expect(() => render(<AdminTour />)).not.toThrow();
  });

  it("renders nothing while the tour is closed", () => {
    mocks.isTourOpen = false;

    const { container } = render(<AdminTour />);

    expect(container).toBeEmptyDOMElement();
  });
});
