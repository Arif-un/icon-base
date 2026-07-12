import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Save } from "./save";
import type { IconBlockAttributes } from "./types";

function attrs(overrides: Partial<IconBlockAttributes> = {}): IconBlockAttributes {
  return {
    svgContent: '<path d="M12 2L2 22h20L12 2z"/>',
    iconId: 1,
    iconName: "triangle",
    iconFilename: "triangle.svg",
    librarySlug: "test",
    libraryDir: "test",
    width: "48px",
    height: "",
    strokeWidth: 1.5,
    iconColor: "",
    customIconColor: "",
    iconBackgroundColor: "",
    customIconBackgroundColor: "",
    gradient: "",
    customGradient: "",
    iconWidth: 24,
    iconHeight: 24,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    linkUrl: "",
    linkTarget: "",
    linkRel: "",
    label: "",
    title: "",
    itemsJustification: "",
    hoverEffect: "none",
    ...overrides,
  };
}

describe("Save", () => {
  it("renders nothing when svgContent is empty", () => {
    const { container } = render(<Save attributes={attrs({ svgContent: "" })} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders SVG wrapped in a div when no linkUrl is provided", () => {
    render(<Save attributes={attrs()} />);
    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("wraps SVG in an anchor element for a valid https linkUrl", () => {
    render(<Save attributes={attrs({ linkUrl: "https://example.com" })} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("does not render a link for a javascript: URL", () => {
    render(<Save attributes={attrs({ linkUrl: "javascript:alert(1)" })} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("adds noreferrer and noopener when linkTarget is _blank", () => {
    render(<Save attributes={attrs({ linkUrl: "https://example.com", linkTarget: "_blank" })} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("sets aria-label on SVG when label is provided", () => {
    render(<Save attributes={attrs({ label: "Warning icon" })} />);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Warning icon");
  });

  it("sets aria-hidden on SVG when no label is provided", () => {
    render(<Save attributes={attrs({ label: "" })} />);
    expect(screen.getByRole("img", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  // Centering must live in the saved markup so it survives plugin deactivation
  // (when style.css is no longer enqueued). See getWrapperStyles.
  it("inlines flex centering on the wrapper by default", () => {
    const { container } = render(<Save attributes={attrs()} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ display: "flex", justifyContent: "center" });
  });

  it("inlines justify-content flex-start for left justification", () => {
    const { container } = render(<Save attributes={attrs({ itemsJustification: "left" })} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ justifyContent: "flex-start" });
  });

  it("inlines justify-content flex-end for right justification", () => {
    const { container } = render(<Save attributes={attrs({ itemsJustification: "right" })} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ justifyContent: "flex-end" });
  });
});
