import clsx from "clsx";

import type { IconBlockAttributes } from "../types";

function sanitizeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, "");
}

export function getWrapperClasses(attributes: IconBlockAttributes): string {
  const { itemsJustification } = attributes;

  return clsx(itemsJustification && `items-justified-${itemsJustification}`);
}

export function getContainerClasses(attributes: IconBlockAttributes): string {
  const {
    iconColor,
    customIconColor,
    iconBackgroundColor,
    customIconBackgroundColor,
    gradient,
    customGradient,
    hoverEffect,
  } = attributes;

  return clsx("icon-container", {
    "has-icon-color": iconColor || customIconColor,
    [`has-${sanitizeSlug(iconColor)}-color`]: iconColor,
    "has-icon-background-color":
      iconBackgroundColor || customIconBackgroundColor || gradient || customGradient,
    [`has-${sanitizeSlug(iconBackgroundColor)}-background-color`]: iconBackgroundColor,
    "has-background-gradient": gradient || customGradient,
    [`has-${sanitizeSlug(gradient)}-gradient-background`]: gradient,
    "has-hover-scale": hoverEffect === "scale",
    "has-hover-color": hoverEffect === "color",
    "has-hover-opacity": hoverEffect === "opacity",
  });
}

export function getContainerStyles(
  attributes: IconBlockAttributes,
): Record<string, string | undefined> {
  const {
    iconColor,
    customIconColor,
    iconBackgroundColor,
    customIconBackgroundColor,
    gradient,
    customGradient,
    rotate,
    flipHorizontal,
    flipVertical,
    strokeWidth,
  } = attributes;

  const styles: Record<string, string | undefined> = {};

  if (iconColor) {
    styles.color = `var(--wp--preset--color--${sanitizeSlug(iconColor)})`;
  } else if (customIconColor) {
    styles.color = customIconColor;
  }

  if (gradient) {
    styles.background = `var(--wp--preset--gradient--${sanitizeSlug(gradient)})`;
  } else if (customGradient) {
    styles.background = customGradient;
  } else if (iconBackgroundColor) {
    styles.backgroundColor = `var(--wp--preset--color--${sanitizeSlug(iconBackgroundColor)})`;
  } else if (customIconBackgroundColor) {
    styles.backgroundColor = customIconBackgroundColor;
  }

  if (rotate) styles["--ib-rotate"] = `${String(rotate)}deg`;
  if (flipHorizontal) styles["--ib-flip-x"] = "-1";
  if (flipVertical) styles["--ib-flip-y"] = "-1";

  if (strokeWidth !== 1.5) styles["--icon-stroke-width"] = String(strokeWidth);

  return styles;
}
