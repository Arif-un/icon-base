import type { IconBlockAttributes } from "./types";
import { getContainerClasses, getContainerStyles, getWrapperClasses } from "./utils/blockStyles";
import { isSafeUrl } from "./utils/svgUtils";

export function Save({ attributes }: { attributes: IconBlockAttributes }) {
  const blockProps = window.wp.blockEditor.useBlockProps.save({
    className: getWrapperClasses(attributes),
  });

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
  const containerStyles = getContainerStyles(attributes);

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
      {linkUrl && isSafeUrl(linkUrl) ? (
        <a {...containerProps} href={linkUrl} target={linkTarget || undefined} rel={rel}>
          {svgElement}
        </a>
      ) : (
        <div {...containerProps}>{svgElement}</div>
      )}
    </div>
  );
}
