import type { IconBlockAttributes } from "./types";

export function Save({ attributes }: { attributes: IconBlockAttributes }) {
  const blockProps = window.wp.blockEditor.useBlockProps.save();
  const { svgContent, size, color, strokeWidth, iconWidth, iconHeight, iconName } = attributes;

  if (!svgContent) {
    return null;
  }

  return (
    <div {...blockProps}>
      <div className="icon-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${String(iconWidth)} ${String(iconHeight)}`}
          width={size}
          height={size}
          fill="currentColor"
          style={{
            color: color || undefined,
            ["--icon-stroke-width" as string]: strokeWidth,
          }}
          role="img"
          aria-label={iconName}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
}
