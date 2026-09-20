import { __ } from "@/common/helpers/i18nWrap";
import Logo from "@/components/Logo";

const { Button } = window.wp.components;

export default function IconPlaceholder({
  onBrowseIcon,
  onMediaLibrary,
  onCustomSvg,
  onShowGuide,
}: {
  onBrowseIcon: () => void;
  onMediaLibrary: () => void;
  onCustomSvg: () => void;
  onShowGuide: () => void;
}) {
  return (
    <div
      data-testid="block-placeholder"
      className="box-border flex w-full flex-col items-center gap-2 border px-4 py-3"
    >
      <div className="flex w-full gap-2">
        <div className="mt-1">
          <Logo size={32} />
        </div>
        <div>
          <div className="text-sm leading-[1.4] font-semibold text-[#1e1e1e]">Icon Indexa</div>
          <div className="text-xs leading-[1.4]">
            Choose icon from library or pick from media or insert custom SVG
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2">
        <div className="mt-1 flex flex-wrap gap-2">
          <Button data-testid="block-browse-icon" variant="primary" onClick={onBrowseIcon}>
            Browse Icon
          </Button>
          <Button data-testid="block-media-library" variant="secondary" onClick={onMediaLibrary}>
            Media Library
          </Button>
          <Button data-testid="block-insert-custom-svg" variant="secondary" onClick={onCustomSvg}>
            Insert Custom SVG
          </Button>
          <Button variant="tertiary" onClick={onShowGuide}>
            {__("How it works")}
          </Button>
        </div>
      </div>
    </div>
  );
}
