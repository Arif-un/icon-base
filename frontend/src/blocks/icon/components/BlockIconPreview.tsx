export default function BlockIconPreview({
  svgContent,
  size,
  color,
  strokeWidth,
  iconWidth,
  iconHeight,
}: {
  svgContent: string;
  size: number;
  color: string;
  strokeWidth: number;
  iconWidth: number;
  iconHeight: number;
}) {
  return (
    <div>
      <svg
        className="icon-base-preview"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${String(iconWidth)} ${String(iconHeight)}`}
        width={size}
        height={size}
        fill="currentColor"
        style={{
          color: color || undefined,
          ["--icon-stroke-width" as string]: strokeWidth,
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
