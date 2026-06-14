import { useMemo } from "react";

import type { IconBlockAttributes } from "../types";
import { svgHasStrokes } from "../utils/svgUtils";

const {
  PanelBody,
  SelectControl,
  TextControl,
  RangeControl,
  Button,
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
  { label: "None", value: "none" },
  { label: "Scale", value: "scale" },
  { label: "Color Change", value: "color" },
  { label: "Opacity", value: "opacity" },
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
}: {
  attributes: IconBlockAttributes;
  setAttributes: (attrs: Partial<IconBlockAttributes>) => void;
}) {
  const {
    width,
    height,
    rotate,
    strokeWidth,
    svgContent,
    label,
    title,
    linkRel,
    hoverEffect,
    iconColor,
    customIconColor,
    iconBackgroundColor,
    customIconBackgroundColor,
    gradient,
    customGradient,
  } = attributes;

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
      <PanelBody title="Settings">
        <TextControl
          label="Label"
          help="Accessible label for screen readers"
          value={label}
          onChange={(val: string) => setAttributes({ label: val })}
        />

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <UnitControl
            label="Width"
            value={width}
            units={SIZE_UNITS}
            onChange={(val: string) => setAttributes({ width: val || "48px" })}
          />
          <UnitControl
            label="Height"
            value={height}
            units={SIZE_UNITS}
            onChange={(val: string) => setAttributes({ height: val })}
          />
        </div>

        <SelectControl
          __next40pxDefaultSize
          label="Rotation"
          value={String(rotate)}
          options={ROTATION_OPTIONS}
          onChange={(val: string | string[]) =>
            setAttributes({ rotate: Number(typeof val === "string" ? val : val[0]) })
          }
        />

        {hasStrokes && (
          <RangeControl
            label="Stroke Width"
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
          label="Hover Effect"
          help="Applied when icon is wrapped in a link"
          value={hoverEffect}
          options={HOVER_OPTIONS}
          onChange={(val: string | string[]) =>
            setAttributes({ hoverEffect: typeof val === "string" ? val : val[0] })
          }
        />

        <Button variant="secondary" onClick={handleResetAll} size="small">
          Reset All
        </Button>
      </PanelBody>

      <PanelColorGradientSettings
        title="Color"
        initialOpen={false}
        settings={[
          {
            label: "Icon",
            colorValue: iconColorValue,
            onColorChange: (val: string | undefined) => {
              const match = val ? colors?.find((c) => c.color === val) : undefined;
              setAttributes({
                iconColor: match?.slug ?? "",
                customIconColor: match ? "" : (val ?? ""),
              });
            },
          },
          {
            label: "Background",
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

      <PanelBody title="Advanced" initialOpen={false}>
        <TextControl
          label="Link Rel"
          help="Relationship attribute for the link (e.g. nofollow)"
          value={linkRel}
          onChange={(val: string) => setAttributes({ linkRel: val })}
        />
        <TextControl
          label="Title"
          help="Descriptive title shown as tooltip on hover"
          value={title}
          onChange={(val: string) => setAttributes({ title: val })}
        />
      </PanelBody>
    </InspectorControls>
  );
}
