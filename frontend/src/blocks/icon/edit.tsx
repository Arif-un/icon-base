import { QueryClientProvider } from "@tanstack/react-query";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";

import { markOnboardingSeen } from "@/common/helpers/onboarding";

import BlockIconPreview from "./components/BlockIconPreview";
import CustomSvgModal from "./components/CustomSvgModal";
import IconPickerModal from "./components/IconPickerModal";
import IconPickerPopover from "./components/IconPickerPopover";
import IconPlaceholder from "./components/IconPlaceholder";
import InspectorSettings from "./components/InspectorSettings";
import ToolbarControls from "./components/ToolbarControls";
import WelcomeGuide from "./components/WelcomeGuide";
import { queryClient } from "./constants";
import type { IconBlockAttributes, SelectedIconData } from "./types";
import { getWrapperClasses } from "./utils/blockStyles";
import { openMediaLibrary } from "./utils/openMediaLibrary";
import { stripSvgColors } from "./utils/svgUtils";
import { shouldAutoOpenWelcomeGuide } from "./utils/welcomeGuideState";

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
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);

  const hasIcon = !!attributes.svgContent;

  // Introduce the block the first time a user actually selects one, rather than on page load,
  // so the guide never interrupts someone who is editing an unrelated post.
  useEffect(() => {
    if (isSelected && shouldAutoOpenWelcomeGuide()) {
      // Selection is owned by the editor, not by us, so there is no event handler to hang
      // this off. The latch inside shouldAutoOpenWelcomeGuide makes it fire at most once
      // per session, so this cannot cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWelcomeGuide(true);
    }
  }, [isSelected]);

  function handleFinishWelcomeGuide() {
    setShowWelcomeGuide(false);
    void markOnboardingSeen("editorGuide");
  }

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
          <InspectorSettings
            attributes={attributes}
            setAttributes={setAttributes}
            onShowGuide={() => {
              setShowWelcomeGuide(true);
            }}
          />
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
          onShowGuide={() => {
            setShowWelcomeGuide(true);
          }}
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

      {showWelcomeGuide && <WelcomeGuide onFinish={handleFinishWelcomeGuide} />}
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
