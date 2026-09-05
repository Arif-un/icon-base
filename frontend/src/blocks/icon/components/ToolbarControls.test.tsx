/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { IconBlockAttributes } from "../types";

const el = React.createElement;

// ToolbarControls destructures window.wp.* at module load, so override the mocks BEFORE the first
// (dynamic) import. The shared LinkControl mock only surfaces url onChange; we replace it with one
// that also exercises opensInNewTab + onRemove, and replace Popover so onClose is reachable.
const wp = (window as any).wp;
const orig = {
  linkControl: wp.blockEditor.__experimentalLinkControl,
  popover: wp.components.Popover,
};

let ToolbarControls: (props: any) => any;

beforeAll(async () => {
  wp.blockEditor.__experimentalLinkControl = ({ value, onChange, onRemove }: any) =>
    el("div", { "data-linkcontrol": true }, [
      el("input", {
        key: "url",
        "aria-label": "Link URL",
        value: value?.url ?? "",
        onChange: (e: any) =>
          onChange?.({ url: e.target.value, opensInNewTab: value?.opensInNewTab }),
      }),
      // Fires opensInNewTab === true with NO url, hitting `next.url ?? ""` and the "_blank" branch.
      el(
        "button",
        {
          key: "newtab",
          "aria-label": "Open in new tab",
          onClick: () => onChange?.({ opensInNewTab: true }),
        },
        "newtab",
      ),
      el(
        "button",
        { key: "remove", "aria-label": "Remove link", onClick: () => onRemove?.() },
        "remove",
      ),
    ]);

  wp.components.Popover = ({ children, onClose }: any) =>
    el("div", { role: "tooltip" }, [
      el("button", { key: "close", "aria-label": "Close popover", onClick: onClose }, "close"),
      children,
    ]);

  ({ default: ToolbarControls } = await import("./ToolbarControls"));
});

afterAll(() => {
  wp.blockEditor.__experimentalLinkControl = orig.linkControl;
  wp.components.Popover = orig.popover;
});

afterEach(cleanup);

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

function renderToolbar(overrides: Partial<IconBlockAttributes> = {}, isSelected = true) {
  const setAttributes = vi.fn();
  const utils = render(
    <ToolbarControls
      attributes={attrs(overrides)}
      setAttributes={setAttributes}
      isSelected={isSelected}
    />,
  );

  return { setAttributes, ...utils };
}

describe("ToolbarControls - rendering", () => {
  it("renders all toolbar buttons", () => {
    renderToolbar();
    expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Justify left" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Justify center" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Justify right" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rotate (0°)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flip horizontal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flip vertical" })).toBeInTheDocument();
  });

  it("renders the Link button when a linkUrl exists (pressed state)", () => {
    // Exercises the `isPressed={!!linkUrl}` truthy path.
    renderToolbar({ linkUrl: "https://example.com" });
    expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
  });

  it("does not render the link popover initially", () => {
    renderToolbar();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("ToolbarControls - link popover", () => {
  it("toggles the popover open and closed via the Link button", () => {
    renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closes the popover via its onClose handler", () => {
    renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    fireEvent.click(screen.getByRole("button", { name: "Close popover" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("sets url and clears target when the link changes without a new tab", () => {
    const { setAttributes } = renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    fireEvent.change(screen.getByLabelText("Link URL"), {
      target: { value: "https://example.com" },
    });
    expect(setAttributes).toHaveBeenCalledWith({
      linkUrl: "https://example.com",
      linkTarget: "",
    });
  });

  it("sets _blank target and empty url when opening in a new tab with no url", () => {
    const { setAttributes } = renderToolbar();
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    fireEvent.click(screen.getByRole("button", { name: "Open in new tab" }));
    expect(setAttributes).toHaveBeenCalledWith({ linkUrl: "", linkTarget: "_blank" });
  });

  it("removes the link and closes the popover via onRemove", () => {
    const { setAttributes } = renderToolbar({ linkUrl: "https://example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
    expect(setAttributes).toHaveBeenCalledWith({ linkUrl: "", linkTarget: "", linkRel: "" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("ToolbarControls - keyboard shortcuts", () => {
  it("opens the popover on Cmd+K", () => {
    renderToolbar();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("opens the popover on Ctrl+K", () => {
    renderToolbar();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("clears the link on Cmd+Shift+K", () => {
    const { setAttributes } = renderToolbar({ linkUrl: "https://example.com" });
    // Open first so we can assert it also closes.
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", metaKey: true, shiftKey: true });
    expect(setAttributes).toHaveBeenCalledWith({ linkUrl: "", linkTarget: "", linkRel: "" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("ignores a modified key that is not 'k'", () => {
    const { setAttributes } = renderToolbar();
    fireEvent.keyDown(document, { key: "a", metaKey: true });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(setAttributes).not.toHaveBeenCalled();
  });

  it("ignores 'k' without a modifier", () => {
    const { setAttributes } = renderToolbar();
    fireEvent.keyDown(document, { key: "k" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(setAttributes).not.toHaveBeenCalled();
  });

  it("does not attach the shortcut when the block is not selected", () => {
    const { setAttributes } = renderToolbar({}, false);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(setAttributes).not.toHaveBeenCalled();
  });
});

describe("ToolbarControls - justification", () => {
  it("sets left justification when not already left", () => {
    const { setAttributes } = renderToolbar({ itemsJustification: "" });
    fireEvent.click(screen.getByRole("button", { name: "Justify left" }));
    expect(setAttributes).toHaveBeenCalledWith({ itemsJustification: "left" });
  });

  it("clears left justification when already left", () => {
    const { setAttributes } = renderToolbar({ itemsJustification: "left" });
    fireEvent.click(screen.getByRole("button", { name: "Justify left" }));
    expect(setAttributes).toHaveBeenCalledWith({ itemsJustification: "" });
  });

  it("sets center justification when not already center", () => {
    const { setAttributes } = renderToolbar({ itemsJustification: "" });
    fireEvent.click(screen.getByRole("button", { name: "Justify center" }));
    expect(setAttributes).toHaveBeenCalledWith({ itemsJustification: "center" });
  });

  it("clears center justification when already center", () => {
    const { setAttributes } = renderToolbar({ itemsJustification: "center" });
    fireEvent.click(screen.getByRole("button", { name: "Justify center" }));
    expect(setAttributes).toHaveBeenCalledWith({ itemsJustification: "" });
  });

  it("sets right justification when not already right", () => {
    const { setAttributes } = renderToolbar({ itemsJustification: "" });
    fireEvent.click(screen.getByRole("button", { name: "Justify right" }));
    expect(setAttributes).toHaveBeenCalledWith({ itemsJustification: "right" });
  });

  it("clears right justification when already right", () => {
    const { setAttributes } = renderToolbar({ itemsJustification: "right" });
    fireEvent.click(screen.getByRole("button", { name: "Justify right" }));
    expect(setAttributes).toHaveBeenCalledWith({ itemsJustification: "" });
  });
});

describe("ToolbarControls - rotate and flip", () => {
  it("adds 90 degrees when rotation is below 270", () => {
    const { setAttributes } = renderToolbar({ rotate: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Rotate (0°)" }));
    expect(setAttributes).toHaveBeenCalledWith({ rotate: 90 });
  });

  it("wraps back to 0 when rotation is at or above 270", () => {
    const { setAttributes } = renderToolbar({ rotate: 270 });
    fireEvent.click(screen.getByRole("button", { name: "Rotate (270°)" }));
    expect(setAttributes).toHaveBeenCalledWith({ rotate: 0 });
  });

  it("toggles horizontal flip", () => {
    const { setAttributes } = renderToolbar({ flipHorizontal: false });
    fireEvent.click(screen.getByRole("button", { name: "Flip horizontal" }));
    expect(setAttributes).toHaveBeenCalledWith({ flipHorizontal: true });
  });

  it("toggles horizontal flip off when already flipped", () => {
    const { setAttributes } = renderToolbar({ flipHorizontal: true });
    fireEvent.click(screen.getByRole("button", { name: "Flip horizontal" }));
    expect(setAttributes).toHaveBeenCalledWith({ flipHorizontal: false });
  });

  it("toggles vertical flip", () => {
    const { setAttributes } = renderToolbar({ flipVertical: false });
    fireEvent.click(screen.getByRole("button", { name: "Flip vertical" }));
    expect(setAttributes).toHaveBeenCalledWith({ flipVertical: true });
  });
});
