import { QueryClientProvider } from "@tanstack/react-query";
import clsx from "clsx";
import { useCallback, useState } from "react";

import BlockIconPreview from "./components/BlockIconPreview";
import CustomSvgModal from "./components/CustomSvgModal";
import IconPickerModal from "./components/IconPickerModal";
import IconPickerPopover from "./components/IconPickerPopover";
import IconPlaceholder from "./components/IconPlaceholder";
import InspectorSettings from "./components/InspectorSettings";
import ToolbarControls from "./components/ToolbarControls";
import { queryClient } from "./constants";
import type { IconBlockAttributes, SelectedIconData } from "./types";
import { getWrapperClasses } from "./utils/blockStyles";
import { openMediaLibrary } from "./utils/openMediaLibrary";
import { stripSvgColors } from "./utils/svgUtils";

const { DropdownMenu, ToolbarGroup } = window.wp.components;
const { BlockControls } = window.wp.blockEditor;

function EditInner({
  attributes,
  setAttributes,
  isSelected,
}: {
  attributes: IconBlockAttributes;
  setAttributes: (attrs: Partial<IconBlockAttributes>) => void;
  isSelected: boolean;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const anchorRef = useCallback((node: HTMLDivElement | null) => setAnchorEl(node), []);
  const rawBlockProps = window.wp.blockEditor.useBlockProps({
    className: clsx("cursor-pointer", getWrapperClasses(attributes)),
    ref: anchorRef,
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
  const blockProps = { ...rawBlockProps, style: wrapperStyle };
  const [showPopover, setShowPopover] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCustomSvgModal, setShowCustomSvgModal] = useState(false);

  const hasIcon = !!attributes.svgContent;

  function handleSelectIcon(data: SelectedIconData) {
    setAttributes({
      svgContent: stripSvgColors(data.svgContent),
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
    setAttributes({
      svgContent: stripSvgColors(svgContent),
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
      svgContent: stripSvgColors(svgContent),
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
    openMediaLibrary(handleMediaSuccess, (message) => {
      window.wp.data.dispatch("core/notices").createNotice("error", message, {
        type: "snackbar",
        isDismissible: true,
      });
    });
  }

  return (
    <div {...blockProps}>
      {hasIcon && (
        <>
          <InspectorSettings attributes={attributes} setAttributes={setAttributes} />
          <ToolbarControls
            attributes={attributes}
            setAttributes={setAttributes}
            isSelected={isSelected}
          />
          <BlockControls>
            <ToolbarGroup>
              <DropdownMenu
                toggleProps={{
                  className: "h-full",
                  children: "Replace",
                }}
                icon={null}
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
            </ToolbarGroup>
          </BlockControls>
        </>
      )}

      {hasIcon ? (
        <BlockIconPreview attributes={attributes} />
      ) : (
        <IconPlaceholder
          onBrowseIcon={() => setShowPopover(true)}
          onMediaLibrary={handleOpenMediaLibrary}
          onCustomSvg={() => setShowCustomSvgModal(true)}
        />
      )}

      {showPopover && (
        <IconPickerPopover
          anchor={anchorEl}
          selectedIconId={attributes.iconId}
          onSelectIcon={handleSelectIcon}
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
          onSelectIcon={handleSelectIcon}
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
  isSelected: boolean;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <EditInner {...props} />
    </QueryClientProvider>
  );
}
