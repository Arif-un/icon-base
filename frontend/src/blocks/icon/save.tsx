import type { IconBlockAttributes } from "./types";
import {
  getContainerClasses,
  getContainerStyles,
  getSpacingStyles,
  getWrapperClasses,
  getWrapperStyles,
} from "./utils/blockStyles";
import { isSafeUrl } from "./utils/svgUtils";

export function Save({ attributes }: { attributes: IconBlockAttributes }) {
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

  const isLinked = Boolean(linkUrl && isSafeUrl(linkUrl));

  // When the icon is wrapped in a link, the anchor carries the accessible name (aria-label below),
  // so the graphic is made decorative (aria-hidden) to avoid a screen reader announcing the same
  // name twice - once for the link, then again for the role="img" child. Only the standalone
  // (non-linked) icon exposes the name on the svg itself.
  const ariaProps: Record<string, string> = isLinked
    ? { "aria-hidden": "true" }
    : label
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
      // Emit stored svgContent verbatim (matches v1.0.2 serialized output, so existing posts
      // still pass block validation). Content is sanitized at insert time (edit.tsx via
      // stripSvgColors, and the custom-SVG modal via sanitizeSvg). The public frontend, which
      // echoes stored post_content without re-running save(), is protected server-side by the
      // render_block wp_kses pass in BlockProvider::sanitizeIconBlockOutput, covering the Code
      // Editor / REST authoring path reachable only by unfiltered_html users.
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
      {isLinked ? (
        // The wrapped svg is always aria-hidden (see ariaProps), so give the anchor its own
        // accessible name from label || title; otherwise a linked icon with no label/title is
        // announced as a bare "link" (WCAG 2.4.4/4.1.2). InspectorSettings warns the author when
        // both are empty.
        <a
          {...containerProps}
          href={linkUrl}
          target={linkTarget || undefined}
          rel={rel}
          aria-label={label || title || undefined}
        >
          {svgElement}
        </a>
      ) : (
        <div {...containerProps}>{svgElement}</div>
      )}
    </div>
  );
}
