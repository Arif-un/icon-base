import type { Meta, StoryObj } from "@storybook/react";

import type { IconBlockAttributes } from "../types";
import BlockIconPreview from "./BlockIconPreview";

// A minimal circle SVG path for visual preview stories
const CIRCLE_SVG = '<circle cx="12" cy="12" r="10"/>';

const BASE_ATTRS: IconBlockAttributes = {
  svgContent: CIRCLE_SVG,
  iconId: 1,
  iconName: "circle",
  iconFilename: "circle.svg",
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
};

const meta: Meta<typeof BlockIconPreview> = {
  title: "Block/BlockIconPreview",
  component: BlockIconPreview,
  args: { attributes: BASE_ATTRS },
};

export default meta;
type Story = StoryObj<typeof BlockIconPreview>;

export const Default: Story = {};

export const WithAriaLabel: Story = {
  name: "With aria-label",
  args: { attributes: { ...BASE_ATTRS, label: "Circle icon" } },
};

export const WithCustomColor: Story = {
  name: "With custom icon color",
  args: { attributes: { ...BASE_ATTRS, customIconColor: "#e63946" } },
};

export const Rotated: Story = {
  name: "Rotated 45deg",
  args: { attributes: { ...BASE_ATTRS, rotate: 45 } },
};
