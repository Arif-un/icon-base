import { QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import BlockIconPreview from "./components/BlockIconPreview";
import CustomSvgModal from "./components/CustomSvgModal";
import IconPickerModal from "./components/IconPickerModal";
import IconPickerPopover from "./components/IconPickerPopover";
import IconPlaceholder from "./components/IconPlaceholder";
import { queryClient, replaceIcon } from "./constants";
import type { IconBlockAttributes, SelectedIconData } from "./types";
import { openMediaLibrary } from "./utils/openMediaLibrary";

const { Button, DropdownMenu } = window.wp.components;
const { BlockControls } = window.wp.blockEditor;

function EditInner({
  attributes,
  setAttributes,
}: {
  attributes: IconBlockAttributes;
  setAttributes: (attrs: Partial<IconBlockAttributes>) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const anchorRef = useCallback((node: HTMLDivElement | null) => setAnchorEl(node), []);
  const blockProps = window.wp.blockEditor.useBlockProps({
    className: "cursor-pointer",
    ref: anchorRef,
  });
  const [showPopover, setShowPopover] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCustomSvgModal, setShowCustomSvgModal] = useState(false);
  const [mediaError, setMediaError] = useState("");

  const hasIcon = !!attributes.svgContent;

  function handleSelectIcon(data: SelectedIconData) {
    setAttributes({
      svgContent: data.svgContent,
      iconId: data.iconId,
      iconName: data.iconName,
      iconFilename: data.iconFilename,
      librarySlug: data.librarySlug,
      libraryDir: data.libraryDir,
      iconWidth: data.iconWidth,
      iconHeight: data.iconHeight,
    });
  }

  function handleMediaSuccess(svgContent: string, width: number, height: number) {
    setMediaError("");
    setAttributes({
      svgContent,
      iconId: 0,
      iconName: "",
      iconFilename: "",
      librarySlug: "",
      libraryDir: "",
      iconWidth: width,
      iconHeight: height,
    });
  }

  function handleCustomSvgInsert(svgContent: string, width: number, height: number) {
    setShowCustomSvgModal(false);
    setAttributes({
      svgContent,
      iconId: 0,
      iconName: "",
      iconFilename: "",
      librarySlug: "",
      libraryDir: "",
      iconWidth: width,
      iconHeight: height,
    });
  }

  function handleOpenMediaLibrary() {
    openMediaLibrary(handleMediaSuccess, (message) => setMediaError(message));
  }

  return (
    <div {...blockProps}>
      {hasIcon && (
        <BlockControls>
          <DropdownMenu
            icon={replaceIcon}
            label="Replace Icon"
            controls={[
              {
                title: "Browse Icon",
                icon: "search",
                onClick: () => setShowPopover(true),
              },
              {
                title: "Media Library",
                icon: "admin-media",
                onClick: handleOpenMediaLibrary,
              },
              {
                title: "Insert Custom SVG",
                icon: "editor-code",
                onClick: () => setShowCustomSvgModal(true),
              },
            ]}
          />
        </BlockControls>
      )}

      {hasIcon ? (
        <BlockIconPreview
          svgContent={attributes.svgContent}
          size={attributes.size}
          color={attributes.color}
          strokeWidth={attributes.strokeWidth}
          iconWidth={attributes.iconWidth}
          iconHeight={attributes.iconHeight}
        />
      ) : (
        <IconPlaceholder
          onBrowseIcon={() => setShowPopover(true)}
          onMediaLibrary={handleOpenMediaLibrary}
          onCustomSvg={() => setShowCustomSvgModal(true)}
        />
      )}

      {mediaError && (
        <div className="mt-2 flex items-center gap-2 rounded-sm border-l-4 border-l-[#cc1818] bg-[#fcf0f1] px-3 py-2 text-[13px] text-[#cc1818]">
          {mediaError}
          <Button variant="link" onClick={() => setMediaError("")}>
            Dismiss
          </Button>
        </div>
      )}

      {showPopover && (
        <IconPickerPopover
          anchor={anchorEl}
          selectedIconId={attributes.iconId}
          size={attributes.size}
          strokeWidth={attributes.strokeWidth}
          color={attributes.color}
          onSelectIcon={handleSelectIcon}
          onSizeChange={(size) => setAttributes({ size })}
          onStrokeWidthChange={(strokeWidth) => setAttributes({ strokeWidth })}
          onColorChange={(color) => setAttributes({ color })}
          onExpand={() => {
            setShowPopover(false);
            setShowModal(true);
          }}
          onClose={() => setShowPopover(false)}
        />
      )}

      {showModal && (
        <IconPickerModal
          selectedIconId={attributes.iconId}
          size={attributes.size}
          strokeWidth={attributes.strokeWidth}
          color={attributes.color}
          onSelectIcon={handleSelectIcon}
          onSizeChange={(size) => setAttributes({ size })}
          onStrokeWidthChange={(strokeWidth) => setAttributes({ strokeWidth })}
          onColorChange={(color) => setAttributes({ color })}
          onClose={() => setShowModal(false)}
        />
      )}

      {showCustomSvgModal && (
        <CustomSvgModal
          onInsert={handleCustomSvgInsert}
          onClose={() => setShowCustomSvgModal(false)}
        />
      )}
    </div>
  );
}

export function Edit(props: {
  attributes: IconBlockAttributes;
  setAttributes: (attrs: Partial<IconBlockAttributes>) => void;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <EditInner {...props} />
    </QueryClientProvider>
  );
}
