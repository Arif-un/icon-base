import { useMemo } from "react";

import { __ } from "@/common/helpers/i18nWrap";

import type { IconBlockAttributes } from "../types";
import { svgHasNormalizableColors, svgHasStrokes } from "../utils/svgUtils";
import { strokeLabel } from "./StrokeLabel";

const {
  PanelBody,
  SelectControl,
  TextControl,
  RangeControl,
  Button,
  Notice,
  __experimentalUnitControl: UnitControl,
} = window.wp.components;

const {
  InspectorControls,
  __experimentalPanelColorGradientSettings: PanelColorGradientSettings,
  useSetting,
} = window.wp.blockEditor;

const SIZE_UNITS = [
  { value: "px", label: "px" },
  { value: "%", label: "%" },
  { value: "em", label: "em" },
  { value: "rem", label: "rem" },
  { value: "vw", label: "vw" },
  { value: "vh", label: "vh" },
];

const HOVER_OPTIONS = [
  { label: __("None"), value: "none" },
  { label: __("Scale"), value: "scale" },
  { label: __("Color Change"), value: "color" },
  { label: __("Opacity"), value: "opacity" },
];

const ROTATION_OPTIONS = [
  { label: "0°", value: "0" },
  { label: "90°", value: "90" },
  { label: "180°", value: "180" },
  { label: "270°", value: "270" },
];

export default function InspectorSettings({
  attributes,
  setAttributes,
  onShowGuide,
}: {
  attributes: IconBlockAttributes;
  setAttributes: (attrs: Partial<IconBlockAttributes>) => void;
  onShowGuide: () => void;
}) {
  const {
    width,
    height,
    rotate,
    strokeWidth,
    svgContent,
    label,
    title,
    linkUrl,
    linkRel,
    hoverEffect,
    iconColor,
    customIconColor,
    iconBackgroundColor,
    customIconBackgroundColor,
    gradient,
    customGradient,
    svgNormalizeColors,
  } = attributes;

  // The Icon color control drives the icon only via the container `color` + fill="currentColor".
  // A custom SVG inserted with normalize off keeps its literal fills, which override currentColor,
  // so the control would silently do nothing - hide that one row (Background still applies).
  // But a colorless SVG (no literal fills to preserve) still recolors via currentColor inheritance
  // even with normalize off, so keep the control for it. Library/normalized icons already have their
  // colors stripped to currentColor and carry svgNormalizeColors !== false.
  // ponytail: we don't further hide it for the rare fully-gradient normalized icon (all paint is
  // url() refs, no currentColor to drive). A literal svgContent.includes("currentColor") check is
  // wrong - the root <svg fill="currentColor"> means no-fill shapes recolor by inheritance without
  // any literal currentColor in the content; detecting the dead case needs a full paint walk. Skip.
  const hasLiteralColors = useMemo(() => svgHasNormalizableColors(svgContent), [svgContent]);
  const canRecolorIcon = svgNormalizeColors || !hasLiteralColors;

  const hasStrokes = useMemo(() => svgHasStrokes(svgContent), [svgContent]);
  const colors = useSetting("color.palette") as
    | Array<{ name: string; slug: string; color: string }>
    | undefined;
  const gradients = useSetting("color.gradients") as
    | Array<{ name: string; slug: string; gradient: string }>
    | undefined;

  const iconColorValue = iconColor
    ? (colors?.find((c) => c.slug === iconColor)?.color ?? customIconColor)
    : customIconColor;

  const bgColorValue = iconBackgroundColor
    ? (colors?.find((c) => c.slug === iconBackgroundColor)?.color ?? customIconBackgroundColor)
    : customIconBackgroundColor;

  const gradientValue = gradient
    ? (gradients?.find((g) => g.slug === gradient)?.gradient ?? customGradient) || undefined
    : customGradient || undefined;

  function handleResetAll() {
    setAttributes({
      width: "48px",
      height: "",
      rotate: 0,
      strokeWidth: 1.5,
      label: "",
      title: "",
      hoverEffect: "none",
      iconColor: "",
      customIconColor: "",
      iconBackgroundColor: "",
      customIconBackgroundColor: "",
      gradient: "",
      customGradient: "",
      flipHorizontal: false,
      flipVertical: false,
      linkUrl: "",
      linkTarget: "",
      linkRel: "",
      itemsJustification: "",
    });
  }

  return (
    <InspectorControls>
      <PanelBody title={__("Settings")}>
        <TextControl
          label={__("Label")}
          help={__("Accessible label for screen readers")}
          value={label}
          onChange={(val: string) => setAttributes({ label: val })}
        />

        {linkUrl &&
          !label &&
          !title && (
            // A linked icon whose svg is aria-hidden (no label) and has no title is announced as a bare
            // "link" to screen readers. Nudge the author to name it; the anchor falls back to
            // label || title in save().
            <Notice status="warning" isDismissible={false}>
              {__(
                "This icon links somewhere but has no label. Add a Label so screen readers announce the link.",
              )}
            </Notice>
          )}

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <UnitControl
            label={__("Width")}
            value={width}
            units={SIZE_UNITS}
            onChange={(val: string) => setAttributes({ width: val || "48px" })}
          />
          <UnitControl
            label={__("Height")}
            value={height}
            units={SIZE_UNITS}
            onChange={(val: string) => setAttributes({ height: val })}
          />
        </div>

        <SelectControl
          __next40pxDefaultSize
          label={__("Rotation")}
          value={String(rotate)}
          options={ROTATION_OPTIONS}
          onChange={(val: string | string[]) =>
            setAttributes({ rotate: Number(typeof val === "string" ? val : val[0]) })
          }
        />

        {hasStrokes && (
          <RangeControl
            label={strokeLabel(__("Stroke Width"))}
            value={strokeWidth}
            onChange={(val: number | undefined) =>
              val !== undefined && setAttributes({ strokeWidth: val })
            }
            min={0.5}
            max={4}
            step={0.25}
          />
        )}

        <SelectControl
          __next40pxDefaultSize
          label={__("Hover Effect")}
          help={__("Applied when icon is wrapped in a link")}
          value={hoverEffect}
          options={HOVER_OPTIONS}
          onChange={(val: string | string[]) =>
            setAttributes({ hoverEffect: typeof val === "string" ? val : val[0] })
          }
        />

        <Button variant="secondary" onClick={handleResetAll} size="small">
          {__("Reset All")}
        </Button>
      </PanelBody>

      <PanelColorGradientSettings
        title={__("Color")}
        initialOpen={false}
        settings={[
          ...(canRecolorIcon
            ? [
                {
                  label: __("Icon"),
                  colorValue: iconColorValue,
                  onColorChange: (val: string | undefined) => {
                    const match = val ? colors?.find((c) => c.color === val) : undefined;
                    setAttributes({
                      iconColor: match?.slug ?? "",
                      customIconColor: match ? "" : (val ?? ""),
                    });
                  },
                },
              ]
            : []),
          {
            label: __("Background"),
            colorValue: bgColorValue,
            gradientValue,
            onColorChange: (val: string | undefined) => {
              const match = val ? colors?.find((c) => c.color === val) : undefined;
              setAttributes({
                iconBackgroundColor: match?.slug ?? "",
                customIconBackgroundColor: match ? "" : (val ?? ""),
                ...(val && { gradient: "", customGradient: "" }),
              });
            },
            onGradientChange: (val: string | undefined) => {
              const match = val ? gradients?.find((g) => g.gradient === val) : undefined;
              setAttributes({
                gradient: match?.slug ?? "",
                customGradient: match ? "" : (val ?? ""),
                ...(val && { iconBackgroundColor: "", customIconBackgroundColor: "" }),
              });
            },
          },
        ]}
      />

      <PanelBody title={__("Additional")} initialOpen={false}>
        <TextControl
          label={__("Link Rel")}
          help={__("Relationship attribute for the link (e.g. nofollow)")}
          value={linkRel}
          onChange={(val: string) => setAttributes({ linkRel: val })}
        />
        <TextControl
          label={__("Title")}
          help={__("Descriptive title shown as tooltip on hover")}
          value={title}
          onChange={(val: string) => setAttributes({ title: val })}
        />
      </PanelBody>

      <PanelBody title={__("Help")} initialOpen={false}>
        <Button variant="secondary" onClick={onShowGuide}>
          {__("Show welcome guide")}
        </Button>
      </PanelBody>
    </InspectorControls>
  );
}
