import type { SelectedIconData } from "../types";
import IconPickerPanel from "./IconPickerPanel";

const { Modal } = window.wp.components;

export default function IconPickerModal({
  selectedIconId,
  size,
  strokeWidth,
  color,
  onSelectIcon,
  onSizeChange,
  onStrokeWidthChange,
  onColorChange,
  onClose,
}: {
  selectedIconId: number;
  size: number;
  strokeWidth: number;
  color: string;
  onSelectIcon: (data: SelectedIconData) => void;
  onSizeChange: (size: number) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
  onColorChange: (color: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Select Icon" onRequestClose={onClose} className="ib-picker-modal" size="large">
      <IconPickerPanel
        selectedIconId={selectedIconId}
        size={size}
        strokeWidth={strokeWidth}
        color={color}
        onSelectIcon={onSelectIcon}
        onSizeChange={onSizeChange}
        onStrokeWidthChange={onStrokeWidthChange}
        onColorChange={onColorChange}
        compact={false}
        className="h-[70vh]"
      />
    </Modal>
  );
}
