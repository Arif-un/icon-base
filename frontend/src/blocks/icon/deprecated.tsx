// This is a Gutenberg block deprecation module, not a live component file: it must define the old
// save (SaveV1) alongside the `deprecated` config it exports. Fast refresh never applies to block
// deprecations, so react-refresh/only-export-components is a false positive here.
/* eslint-disable react-refresh/only-export-components */
import type { IconBlockAttributes } from "./types";
import {
  getContainerClasses,
  getContainerStyles,
  getSpacingStyles,
  getWrapperClasses,
  getWrapperStyles,
} from "./utils/blockStyles";
// A deprecation must reproduce the OLD serialization byte-for-byte. The shared isSafeUrl was later
// hardened to reject protocol-relative URLs ("//host"), but v1 markup was serialized with the older
// rule that accepted them (a linked icon with href="//host" was an <a>). Importing the current
// isSafeUrl would make this deprecation emit <div> for such stored blocks and fail validation, so
// v1 carries a frozen copy of the pre-hardening rule. Do NOT swap this for the shared helper.
const SAFE_URL_PROTOCOLS_V1 = /^(https?:|mailto:|tel:|#)/i;
function isSafeUrlV1(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;

  return SAFE_URL_PROTOCOLS_V1.test(trimmed);
}

// v1: the linked-icon anchor had no aria-label. save() later added
// aria-label={label || title} for WCAG 2.4.4/4.1.2, which changes the serialized
// markup of already-published linked icons that also carry a label/title. Without this
// deprecation Gutenberg would flag those stored blocks as invalid and force block
// recovery on edit. This save reproduces the pre-aria-label serialization exactly, so
// WP migrates them silently. Attributes/supports are inherited from the current block
// (unchanged for these fields). Keep in sync with save.tsx MINUS the anchor aria-label.
function SaveV1({ attributes }: { attributes: IconBlockAttributes }) {
  const rawBlockProps = window.wp.blockEditor.useBlockProps.save({
    className: getWrapperClasses(attributes),
  });
  const {
    paddingTop: _paddingTop,
    paddingRight: _paddingRight,
    paddingBottom: _paddingBottom,
    paddingLeft: _paddingLeft,
    marginTop: _marginTop,
    marginRight: _marginRight,
    marginBottom: _marginBottom,
    marginLeft: _marginLeft,
    ...wrapperStyle
  } = (rawBlockProps.style ?? {}) as Record<string, string>;
  const blockProps = {
    ...rawBlockProps,
    style: { ...getWrapperStyles(attributes), ...wrapperStyle },
  };

  const {
    svgContent,
    iconWidth,
    iconHeight,
    width,
    height,
    linkUrl,
    linkTarget,
    linkRel,
    label,
    title,
  } = attributes;

  if (!svgContent) {
    return null;
  }

  const containerClasses = getContainerClasses(attributes);
  const containerStyles = { ...getContainerStyles(attributes), ...getSpacingStyles(attributes) };

  const ariaProps: Record<string, string> = label
    ? { "aria-label": label }
    : { "aria-hidden": "true" };

  const svgElement = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${String(iconWidth)} ${String(iconHeight)}`}
      width={width || "48px"}
      height={height || undefined}
      fill="currentColor"
      role="img"
      {...ariaProps}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );

  const relParts = new Set(linkRel ? linkRel.split(/\s+/).filter(Boolean) : []);
  if (linkTarget === "_blank") {
    relParts.add("noreferrer");
    relParts.add("noopener");
  }
  const rel = relParts.size > 0 ? [...relParts].join(" ") : undefined;

  const containerProps = {
    className: containerClasses,
    style: containerStyles,
    title: title || undefined,
  };

  return (
    <div {...blockProps}>
      {linkUrl && isSafeUrlV1(linkUrl) ? (
        <a {...containerProps} href={linkUrl} target={linkTarget || undefined} rel={rel}>
          {svgElement}
        </a>
      ) : (
        <div {...containerProps}>{svgElement}</div>
      )}
    </div>
  );
}

export const deprecated = [{ save: SaveV1 }];
