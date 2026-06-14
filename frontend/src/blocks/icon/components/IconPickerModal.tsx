import { useState } from "react";

import type { SelectedIconData } from "../types";
import IconPickerPanel from "./IconPickerPanel";

const { Modal } = window.wp.components;

export default function IconPickerModal({
  selectedIconId,
  onSelectIcon,
  onClose,
}: {
  selectedIconId: number;
  onSelectIcon: (data: SelectedIconData) => void;
  onClose: () => void;
}) {
  const [previewSize, setPreviewSize] = useState(24);
  const [previewStrokeWidth, setPreviewStrokeWidth] = useState(1.5);
  const [previewColor, setPreviewColor] = useState("");

  return (
    <Modal title="Select Icon" onRequestClose={onClose} className="ib-picker-modal" size="large">
      <IconPickerPanel
        selectedIconId={selectedIconId}
        size={previewSize}
        strokeWidth={previewStrokeWidth}
        color={previewColor}
        onSelectIcon={onSelectIcon}
        onSizeChange={setPreviewSize}
        onStrokeWidthChange={setPreviewStrokeWidth}
        onColorChange={setPreviewColor}
        compact={false}
        className="h-[70vh]"
      />
    </Modal>
  );
}
