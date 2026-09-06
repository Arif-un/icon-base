import { useMemo } from "react";

import { sanitizeSvg } from "@/common/helpers/fetchSvgContent";

import type { IconBlockAttributes } from "../types";
import { getContainerClasses, getContainerStyles, getSpacingStyles } from "../utils/blockStyles";
import { stripSvgColors } from "../utils/svgUtils";

export default function BlockIconPreview({ attributes }: { attributes: IconBlockAttributes }) {
  const { svgContent, svgNormalizeColors, iconWidth, iconHeight, width, height, label } =
    attributes;
  const containerClasses = getContainerClasses(attributes);
  const containerStyles = { ...getContainerStyles(attributes), ...getSpacingStyles(attributes) };
  // Mirror edit/save: only recolor to currentColor when the block opted into normalization.
  // Always re-sanitize at render time (both branches run DOMPurify) so attributes parsed from
  // stored post content can never inject unsanitized markup into the editor DOM.
  const previewSvg = useMemo(
    () => (svgNormalizeColors ? stripSvgColors(svgContent) : sanitizeSvg(svgContent)),
    [svgContent, svgNormalizeColors],
  );

  const ariaProps: Record<string, string> = label
    ? { "aria-label": label }
    : { "aria-hidden": "true" };

  return (
    <div className={containerClasses} style={containerStyles}>
      <svg
        className="icon-base-preview"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${String(iconWidth)} ${String(iconHeight)}`}
        width={width || "48px"}
        height={height || undefined}
        fill="currentColor"
        role="img"
        {...ariaProps}
        dangerouslySetInnerHTML={{ __html: previewSvg }}
      />
    </div>
  );
}
