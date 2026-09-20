import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";

import { deprecated } from "./deprecated";
import { Save } from "./save";
import type { IconBlockAttributes } from "./types";

function attrs(overrides: Partial<IconBlockAttributes> = {}): IconBlockAttributes {
  return {
    svgContent: '<path d="M12 2L2 22h20L12 2z"/>',
    svgNormalizeColors: true,
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

const SaveV1 = deprecated[0].save as ComponentType<{ attributes: IconBlockAttributes }>;

describe("icon block deprecation", () => {
  it("exposes exactly one deprecation with a save function", () => {
    expect(deprecated).toHaveLength(1);
    expect(typeof deprecated[0].save).toBe("function");
  });

  // Regression guard for the feature-breaking finding: save() added aria-label={label || title} to
  // the linked-icon anchor. That changes the serialized markup of already-published linked icons that
  // carry a label/title, which would trip WP block validation and force block recovery. The
  // deprecation must reproduce the PRE-aria-label anchor so WP migrates those posts silently.
  it("omits the anchor aria-label that the current save now adds (so old linked posts still validate)", () => {
    const linked = attrs({ linkUrl: "https://example.com", label: "Home" });

    render(<SaveV1 attributes={linked} />);
    const oldLink = screen.getByRole("link");
    expect(oldLink).not.toHaveAttribute("aria-label");
  });

  it("current save adds the anchor aria-label the deprecation lacks (the difference being migrated)", () => {
    const linked = attrs({ linkUrl: "https://example.com", label: "Home" });

    render(<Save attributes={linked} />);
    expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Home");
  });

  it("otherwise reproduces the anchor markup (href/rel) so a valid old block matches", () => {
    const linked = attrs({ linkUrl: "https://example.com", linkTarget: "_blank", label: "Home" });

    render(<SaveV1 attributes={linked} />);
    const oldLink = screen.getByRole("link");
    expect(oldLink).toHaveAttribute("href", "https://example.com");
    expect(oldLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  // Regression guard for the feature-breaking finding: the shared isSafeUrl was hardened to reject
  // protocol-relative URLs ("//host"). A linked icon published with href="//host" was serialized as
  // an <a>. The deprecation MUST keep the old, laxer rule (frozen isSafeUrlV1) or it emits <div> and
  // WP flags the stored block invalid, forcing recovery. The current Save correctly emits <div> now.
  it("keeps the anchor for a protocol-relative linkUrl (frozen pre-hardening rule)", () => {
    const linked = attrs({ linkUrl: "//example.com/page" });

    render(<SaveV1 attributes={linked} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "//example.com/page");
  });

  it("current save drops the anchor for a protocol-relative linkUrl (the hardening being migrated)", () => {
    const linked = attrs({ linkUrl: "//example.com/page" });

    render(<Save attributes={linked} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("still renders the plain (non-linked) div branch, which never changed", () => {
    const { container } = render(<SaveV1 attributes={attrs()} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("path")).toHaveAttribute("d", "M12 2L2 22h20L12 2z");
  });
});
