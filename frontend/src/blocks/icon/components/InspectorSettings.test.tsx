/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { IconBlockAttributes } from "../types";

const el = React.createElement;

// The component destructures window.wp.* at module load, so we override the mocks BEFORE the
// (dynamic) first import. This gives us callbacks the shared setup mock does not surface
// (PanelColorGradientSettings onColorChange/onGradientChange), a controllable useSetting palette,
// and the "array value" / "undefined value" branches of Select/Range that a plain DOM change
// event can never produce. Restored in afterAll so no other test file is affected.

// Mutable palette state, controlled per-test. Undefined => useSetting returns undefined (covers the
// `colors?.` / `gradients?.` short-circuit branches).
let paletteColors: Array<{ name: string; slug: string; color: string }> | undefined;
let paletteGradients: Array<{ name: string; slug: string; gradient: string }> | undefined;

const wp = (window as any).wp;
const orig = {
  useSetting: wp.blockEditor.useSetting,
  panel: wp.blockEditor.__experimentalPanelColorGradientSettings,
  select: wp.components.SelectControl,
  range: wp.components.RangeControl,
};

let InspectorSettings: (props: any) => any;

beforeAll(async () => {
  wp.blockEditor.useSetting = (key: string) =>
    key === "color.palette" ? paletteColors : key === "color.gradients" ? paletteGradients : [];

  wp.blockEditor.__experimentalPanelColorGradientSettings = ({
    title,
    settings = [],
    children,
  }: any) =>
    el(
      "div",
      { "data-color-settings": title },
      settings.map((s: any, i: number) =>
        el("div", { key: i, "data-setting": s.label }, [
          el("span", { key: "cv", "data-colorvalue": String(s.colorValue) }, s.label),
          el("span", { key: "gv", "data-gradientvalue": String(s.gradientValue) }),
          el("input", {
            key: "sc",
            "aria-label": `${s.label} set color`,
            onChange: (e: any) => s.onColorChange?.(e.target.value),
          }),
          el(
            "button",
            {
              key: "cc",
              "aria-label": `${s.label} clear color`,
              onClick: () => s.onColorChange?.(undefined),
            },
            "x",
          ),
          s.onGradientChange &&
            el("input", {
              key: "sg",
              "aria-label": `${s.label} set gradient`,
              onChange: (e: any) => s.onGradientChange?.(e.target.value),
            }),
          s.onGradientChange &&
            el(
              "button",
              {
                key: "cg",
                "aria-label": `${s.label} clear gradient`,
                onClick: () => s.onGradientChange?.(undefined),
              },
              "x",
            ),
        ]),
      ),
      children,
    );

  // SelectControl: a real <select> (string value) plus a button that fires an ARRAY value,
  // to hit the `typeof val === "string" ? val : val[0]` else-branch.
  wp.components.SelectControl = ({ label, value, options = [], onChange }: any) =>
    el("div", { "data-select": label }, [
      el(
        "select",
        {
          key: "s",
          "aria-label": label,
          value,
          onChange: (e: any) => onChange?.(e.target.value),
        },
        options.map((o: any) => el("option", { key: String(o.value), value: o.value }, o.label)),
      ),
      el(
        "button",
        {
          key: "arr",
          "aria-label": `${label} array`,
          onClick: () => onChange?.([options[1].value]),
        },
        "arr",
      ),
    ]);

  // RangeControl: a range input (number) plus a button that fires `undefined`, to hit the
  // `val !== undefined && ...` short-circuit.
  wp.components.RangeControl = ({ label, value, onChange }: any) =>
    el("div", { "data-range": label }, [
      el("input", {
        key: "r",
        type: "range",
        "aria-label": label,
        value: value ?? "",
        onChange: (e: any) => onChange?.(Number(e.target.value)),
      }),
      el(
        "button",
        { key: "u", "aria-label": `${label} undefined`, onClick: () => onChange?.(undefined) },
        "u",
      ),
    ]);

  ({ default: InspectorSettings } = await import("./InspectorSettings"));
});

afterAll(() => {
  wp.blockEditor.useSetting = orig.useSetting;
  wp.blockEditor.__experimentalPanelColorGradientSettings = orig.panel;
  wp.components.SelectControl = orig.select;
  wp.components.RangeControl = orig.range;
});

beforeEach(() => {
  paletteColors = undefined;
  paletteGradients = undefined;
});

afterEach(cleanup);

const STROKED_SVG = '<path stroke="#000" d="M0 0h10"/>';
const PLAIN_SVG = '<path d="M12 2L2 22h20L12 2z"/>';

function attrs(overrides: Partial<IconBlockAttributes> = {}): IconBlockAttributes {
  return {
    svgContent: PLAIN_SVG,
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

function renderInspector(overrides: Partial<IconBlockAttributes> = {}) {
  const setAttributes = vi.fn();
  const utils = render(
    <InspectorSettings attributes={attrs(overrides)} setAttributes={setAttributes} />,
  );

  return { setAttributes, ...utils };
}

const colorValueOf = (c: HTMLElement, setting: string) =>
  c.querySelector(`[data-setting="${setting}"] [data-colorvalue]`)?.getAttribute("data-colorvalue");
const gradientValueOf = (c: HTMLElement, setting: string) =>
  c
    .querySelector(`[data-setting="${setting}"] [data-gradientvalue]`)
    ?.getAttribute("data-gradientvalue");

const POPULATED_COLORS = [
  { name: "Primary", slug: "primary", color: "#ff0000" },
  { name: "Accent", slug: "accent", color: "#00ff00" },
];
const POPULATED_GRADIENTS = [
  { name: "Cool", slug: "cool", gradient: "linear-gradient(#00f,#0ff)" },
];

describe("InspectorSettings - rendering", () => {
  it("renders the base controls", () => {
    renderInspector();
    expect(screen.getByLabelText("Label")).toBeInTheDocument();
    expect(screen.getByLabelText("Width")).toBeInTheDocument();
    expect(screen.getByLabelText("Height")).toBeInTheDocument();
    expect(screen.getByLabelText("Rotation")).toBeInTheDocument();
    expect(screen.getByLabelText("Hover Effect")).toBeInTheDocument();
    expect(screen.getByText("Reset All")).toBeInTheDocument();
    expect(screen.getByLabelText("Link Rel")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });

  it("hides the Stroke Width control when the SVG has no strokes", () => {
    renderInspector({ svgContent: PLAIN_SVG });
    expect(screen.queryByLabelText("Stroke Width")).toBeNull();
  });

  it("shows the Stroke Width control when the SVG has strokes", () => {
    renderInspector({ svgContent: STROKED_SVG });
    expect(screen.getByLabelText("Stroke Width")).toBeInTheDocument();
  });
});

describe("InspectorSettings - simple control callbacks", () => {
  it("updates label", () => {
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "My icon" } });
    expect(setAttributes).toHaveBeenCalledWith({ label: "My icon" });
  });

  it("updates width with a truthy value", () => {
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "64px" } });
    expect(setAttributes).toHaveBeenCalledWith({ width: "64px" });
  });

  it("falls back to 48px when width is cleared", () => {
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "" } });
    expect(setAttributes).toHaveBeenCalledWith({ width: "48px" });
  });

  it("updates height", () => {
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Height"), { target: { value: "20px" } });
    expect(setAttributes).toHaveBeenCalledWith({ height: "20px" });
  });

  it("updates rotation from a string value", () => {
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Rotation"), { target: { value: "90" } });
    expect(setAttributes).toHaveBeenCalledWith({ rotate: 90 });
  });

  it("updates rotation from an array value", () => {
    const { setAttributes } = renderInspector();
    fireEvent.click(screen.getByLabelText("Rotation array"));
    // ROTATION_OPTIONS[1] === "90"
    expect(setAttributes).toHaveBeenCalledWith({ rotate: 90 });
  });

  it("updates hover effect from a string value", () => {
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Hover Effect"), { target: { value: "scale" } });
    expect(setAttributes).toHaveBeenCalledWith({ hoverEffect: "scale" });
  });

  it("updates hover effect from an array value", () => {
    const { setAttributes } = renderInspector();
    fireEvent.click(screen.getByLabelText("Hover Effect array"));
    // HOVER_OPTIONS[1] === "scale"
    expect(setAttributes).toHaveBeenCalledWith({ hoverEffect: "scale" });
  });

  it("updates stroke width for a defined value", () => {
    const { setAttributes } = renderInspector({ svgContent: STROKED_SVG });
    fireEvent.change(screen.getByLabelText("Stroke Width"), { target: { value: "2" } });
    expect(setAttributes).toHaveBeenCalledWith({ strokeWidth: 2 });
  });

  it("ignores an undefined stroke width value", () => {
    const { setAttributes } = renderInspector({ svgContent: STROKED_SVG });
    fireEvent.click(screen.getByLabelText("Stroke Width undefined"));
    expect(setAttributes).not.toHaveBeenCalled();
  });

  it("updates link rel", () => {
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Link Rel"), { target: { value: "nofollow" } });
    expect(setAttributes).toHaveBeenCalledWith({ linkRel: "nofollow" });
  });

  it("updates title", () => {
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Tooltip" } });
    expect(setAttributes).toHaveBeenCalledWith({ title: "Tooltip" });
  });

  it("resets all attributes to their defaults", () => {
    const { setAttributes } = renderInspector({
      width: "100px",
      rotate: 180,
      iconColor: "primary",
    });
    fireEvent.click(screen.getByText("Reset All"));
    expect(setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        width: "48px",
        height: "",
        rotate: 0,
        strokeWidth: 1.5,
        hoverEffect: "none",
        iconColor: "",
        customIconColor: "",
        gradient: "",
        customGradient: "",
        flipHorizontal: false,
        flipVertical: false,
        linkUrl: "",
        linkTarget: "",
        linkRel: "",
        itemsJustification: "",
      }),
    );
  });
});

describe("InspectorSettings - computed color values", () => {
  it("resolves a preset icon color from the palette", () => {
    paletteColors = POPULATED_COLORS;
    const { container } = renderInspector({ iconColor: "primary" });
    expect(colorValueOf(container, "Icon")).toBe("#ff0000");
  });

  it("falls back to the custom icon color when the preset slug is missing", () => {
    paletteColors = POPULATED_COLORS;
    const { container } = renderInspector({ iconColor: "missing", customIconColor: "#123456" });
    expect(colorValueOf(container, "Icon")).toBe("#123456");
  });

  it("uses the custom icon color when no preset is set", () => {
    const { container } = renderInspector({ iconColor: "", customIconColor: "#999999" });
    expect(colorValueOf(container, "Icon")).toBe("#999999");
  });

  it("falls back to custom icon color when the palette is undefined", () => {
    paletteColors = undefined;
    const { container } = renderInspector({ iconColor: "primary", customIconColor: "#abcabc" });
    expect(colorValueOf(container, "Icon")).toBe("#abcabc");
  });

  it("resolves a preset background color from the palette", () => {
    paletteColors = POPULATED_COLORS;
    const { container } = renderInspector({ iconBackgroundColor: "accent" });
    expect(colorValueOf(container, "Background")).toBe("#00ff00");
  });

  it("falls back to the custom background color when the preset slug is missing", () => {
    paletteColors = POPULATED_COLORS;
    const { container } = renderInspector({
      iconBackgroundColor: "missing",
      customIconBackgroundColor: "#654321",
    });
    expect(colorValueOf(container, "Background")).toBe("#654321");
  });

  it("uses the custom background color when no preset is set", () => {
    const { container } = renderInspector({
      iconBackgroundColor: "",
      customIconBackgroundColor: "#010101",
    });
    expect(colorValueOf(container, "Background")).toBe("#010101");
  });

  it("resolves a preset gradient from the palette", () => {
    paletteGradients = POPULATED_GRADIENTS;
    const { container } = renderInspector({ gradient: "cool" });
    expect(gradientValueOf(container, "Background")).toBe("linear-gradient(#00f,#0ff)");
  });

  it("falls back to the custom gradient when the preset slug is missing", () => {
    paletteGradients = POPULATED_GRADIENTS;
    const { container } = renderInspector({ gradient: "missing", customGradient: "cg-value" });
    expect(gradientValueOf(container, "Background")).toBe("cg-value");
  });

  it("uses the custom gradient when no preset gradient is set", () => {
    const { container } = renderInspector({ gradient: "", customGradient: "custom-grad" });
    expect(gradientValueOf(container, "Background")).toBe("custom-grad");
  });

  it("is undefined when neither preset nor custom gradient is set", () => {
    const { container } = renderInspector({ gradient: "", customGradient: "" });
    expect(gradientValueOf(container, "Background")).toBe("undefined");
  });

  it("falls back to custom gradient when the gradients palette is undefined", () => {
    paletteGradients = undefined;
    const { container } = renderInspector({ gradient: "cool", customGradient: "fallback-grad" });
    expect(gradientValueOf(container, "Background")).toBe("fallback-grad");
  });

  it("is undefined when a preset gradient slug is missing and there is no custom gradient", () => {
    paletteGradients = POPULATED_GRADIENTS;
    const { container } = renderInspector({ gradient: "missing", customGradient: "" });
    expect(gradientValueOf(container, "Background")).toBe("undefined");
  });
});

describe("InspectorSettings - icon onColorChange", () => {
  it("sets a preset slug when the chosen color matches the palette", () => {
    paletteColors = POPULATED_COLORS;
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Icon set color"), { target: { value: "#ff0000" } });
    expect(setAttributes).toHaveBeenCalledWith({ iconColor: "primary", customIconColor: "" });
  });

  it("stores a custom color when it does not match a preset", () => {
    paletteColors = POPULATED_COLORS;
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Icon set color"), { target: { value: "#abcdef" } });
    expect(setAttributes).toHaveBeenCalledWith({ iconColor: "", customIconColor: "#abcdef" });
  });

  it("stores a custom color when the palette is undefined", () => {
    paletteColors = undefined;
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Icon set color"), { target: { value: "#123123" } });
    expect(setAttributes).toHaveBeenCalledWith({ iconColor: "", customIconColor: "#123123" });
  });

  it("clears the icon color when set to undefined", () => {
    const { setAttributes } = renderInspector();
    fireEvent.click(screen.getByLabelText("Icon clear color"));
    expect(setAttributes).toHaveBeenCalledWith({ iconColor: "", customIconColor: "" });
  });
});

describe("InspectorSettings - background onColorChange", () => {
  it("sets a preset background slug and clears any gradient", () => {
    paletteColors = POPULATED_COLORS;
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Background set color"), {
      target: { value: "#00ff00" },
    });
    expect(setAttributes).toHaveBeenCalledWith({
      iconBackgroundColor: "accent",
      customIconBackgroundColor: "",
      gradient: "",
      customGradient: "",
    });
  });

  it("stores a custom background color when it does not match a preset", () => {
    paletteColors = POPULATED_COLORS;
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Background set color"), {
      target: { value: "#777777" },
    });
    expect(setAttributes).toHaveBeenCalledWith({
      iconBackgroundColor: "",
      customIconBackgroundColor: "#777777",
      gradient: "",
      customGradient: "",
    });
  });

  it("clears the background color without touching the gradient when set to undefined", () => {
    const { setAttributes } = renderInspector();
    fireEvent.click(screen.getByLabelText("Background clear color"));
    expect(setAttributes).toHaveBeenCalledWith({
      iconBackgroundColor: "",
      customIconBackgroundColor: "",
    });
    // The `...(val && {...})` spread must NOT add gradient keys when clearing.
    const call = setAttributes.mock.calls[0][0];
    expect(call).not.toHaveProperty("gradient");
  });
});

describe("InspectorSettings - background onGradientChange", () => {
  it("sets a preset gradient slug and clears any background color", () => {
    paletteGradients = POPULATED_GRADIENTS;
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Background set gradient"), {
      target: { value: "linear-gradient(#00f,#0ff)" },
    });
    expect(setAttributes).toHaveBeenCalledWith({
      gradient: "cool",
      customGradient: "",
      iconBackgroundColor: "",
      customIconBackgroundColor: "",
    });
  });

  it("stores a custom gradient when it does not match a preset", () => {
    paletteGradients = POPULATED_GRADIENTS;
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Background set gradient"), {
      target: { value: "radial-gradient(#000,#fff)" },
    });
    expect(setAttributes).toHaveBeenCalledWith({
      gradient: "",
      customGradient: "radial-gradient(#000,#fff)",
      iconBackgroundColor: "",
      customIconBackgroundColor: "",
    });
  });

  it("stores a custom gradient when the gradients palette is undefined", () => {
    paletteGradients = undefined;
    const { setAttributes } = renderInspector();
    fireEvent.change(screen.getByLabelText("Background set gradient"), {
      target: { value: "conic-gradient(#111,#222)" },
    });
    expect(setAttributes).toHaveBeenCalledWith({
      gradient: "",
      customGradient: "conic-gradient(#111,#222)",
      iconBackgroundColor: "",
      customIconBackgroundColor: "",
    });
  });

  it("clears the gradient without touching the background color when set to undefined", () => {
    const { setAttributes } = renderInspector();
    fireEvent.click(screen.getByLabelText("Background clear gradient"));
    expect(setAttributes).toHaveBeenCalledWith({ gradient: "", customGradient: "" });
    const call = setAttributes.mock.calls[0][0];
    expect(call).not.toHaveProperty("iconBackgroundColor");
  });
});
