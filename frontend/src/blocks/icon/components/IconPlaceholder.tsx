import { LOGO_SVG_PATH } from "../constants";

const { Button } = window.wp.components;

export default function IconPlaceholder({
  onBrowseIcon,
  onMediaLibrary,
  onCustomSvg,
}: {
  onBrowseIcon: () => void;
  onMediaLibrary: () => void;
  onCustomSvg: () => void;
}) {
  return (
    <div className="box-border flex w-full flex-col items-center gap-2 border px-4 py-3">
      <div className="flex w-full gap-2">
        <svg
          className="mt-1 text-[#1e1e1e]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 104 104"
          width="32"
          height="32"
          fill="currentColor"
        >
          <path d={LOGO_SVG_PATH} />
        </svg>
        <div>
          <div className="text-sm leading-[1.4] font-semibold text-[#1e1e1e]">Icon Base</div>
          <div className="text-xs leading-[1.4]">
            Choose icon from library or pick from media or insert custom SVG
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="mt-1 flex flex-wrap gap-2">
          <Button variant="primary" onClick={onBrowseIcon}>
            Browse Icon
          </Button>
          <Button variant="secondary" onClick={onMediaLibrary}>
            Media Library
          </Button>
          <Button variant="secondary" onClick={onCustomSvg}>
            Insert Custom SVG
          </Button>
        </div>
      </div>
    </div>
  );
}
