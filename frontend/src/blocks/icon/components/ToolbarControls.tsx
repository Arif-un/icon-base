import {
  flipHorizontal as flipH,
  flipVertical as flipV,
  justifyLeft,
  justifyCenter,
  justifyRight,
  link as linkIcon,
  rotateRight,
} from "@wordpress/icons";
import { useEffect, useState } from "react";

import type { IconBlockAttributes } from "../types";

const { ToolbarButton, ToolbarGroup, Popover } = window.wp.components;
const { BlockControls, __experimentalLinkControl: LinkControl } = window.wp.blockEditor;

export default function ToolbarControls({
  attributes,
  setAttributes,
  isSelected,
}: {
  attributes: IconBlockAttributes;
  setAttributes: (attrs: Partial<IconBlockAttributes>) => void;
  isSelected: boolean;
}) {
  const { linkUrl, linkTarget, rotate, flipHorizontal, flipVertical, itemsJustification } =
    attributes;
  const [isEditingLink, setIsEditingLink] = useState(false);

  useEffect(() => {
    if (!isSelected) return;

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        setIsEditingLink(true);
      }
      if (mod && e.key === "k" && e.shiftKey) {
        e.preventDefault();
        setAttributes({ linkUrl: "", linkTarget: "", linkRel: "" });
        setIsEditingLink(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, setAttributes]);

  function handleRotate() {
    setAttributes({ rotate: rotate >= 270 ? 0 : rotate + 90 });
  }

  return (
    <BlockControls group="block">
      <ToolbarGroup>
        <ToolbarButton
          icon={linkIcon}
          label="Link"
          onClick={() => setIsEditingLink(!isEditingLink)}
          isPressed={!!linkUrl}
        />
        {isEditingLink && (
          <Popover
            position="bottom center"
            onClose={() => setIsEditingLink(false)}
            focusOnMount="firstElement"
          >
            <LinkControl
              value={{
                url: linkUrl,
                opensInNewTab: linkTarget === "_blank",
              }}
              onChange={(next: { url?: string; opensInNewTab?: boolean }) => {
                setAttributes({
                  linkUrl: next.url ?? "",
                  linkTarget: next.opensInNewTab ? "_blank" : "",
                });
              }}
              onRemove={() => {
                setAttributes({ linkUrl: "", linkTarget: "", linkRel: "" });
                setIsEditingLink(false);
              }}
            />
          </Popover>
        )}
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          icon={justifyLeft}
          label="Justify left"
          onClick={() =>
            setAttributes({ itemsJustification: itemsJustification === "left" ? "" : "left" })
          }
          isPressed={itemsJustification === "left"}
        />
        <ToolbarButton
          icon={justifyCenter}
          label="Justify center"
          onClick={() =>
            setAttributes({ itemsJustification: itemsJustification === "center" ? "" : "center" })
          }
          isPressed={itemsJustification === "center"}
        />
        <ToolbarButton
          icon={justifyRight}
          label="Justify right"
          onClick={() =>
            setAttributes({ itemsJustification: itemsJustification === "right" ? "" : "right" })
          }
          isPressed={itemsJustification === "right"}
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          icon={rotateRight}
          label={`Rotate (${String(rotate)}°)`}
          onClick={handleRotate}
        />
        <ToolbarButton
          icon={flipH}
          label="Flip horizontal"
          onClick={() => setAttributes({ flipHorizontal: !flipHorizontal })}
          isPressed={flipHorizontal}
        />
        <ToolbarButton
          icon={flipV}
          label="Flip vertical"
          onClick={() => setAttributes({ flipVertical: !flipVertical })}
          isPressed={flipVertical}
        />
      </ToolbarGroup>
    </BlockControls>
  );
}
