import type { IconBlockAttributes } from "../types";
import { getContainerClasses, getContainerStyles } from "../utils/blockStyles";
import { stripSvgColors } from "../utils/svgUtils";

export default function BlockIconPreview({ attributes }: { attributes: IconBlockAttributes }) {
  const { svgContent, iconWidth, iconHeight, width, height, label } = attributes;
  const containerClasses = getContainerClasses(attributes);
  const containerStyles = getContainerStyles(attributes);
  const strippedSvg = stripSvgColors(svgContent);

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
        dangerouslySetInnerHTML={{ __html: strippedSvg }}
      />
    </div>
  );
}
