import type { ComponentType, ReactNode } from "react";

interface UseBlockPropsReturn {
  className: string;
  [key: string]: unknown;
}

interface UseBlockProps {
  (props?: Record<string, unknown>): UseBlockPropsReturn;
  save: (props?: Record<string, unknown>) => UseBlockPropsReturn;
}

interface BlockAttributes {
  [key: string]: unknown;
}

interface BlockEditProps<T extends BlockAttributes = BlockAttributes> {
  attributes: T;
  setAttributes: (attrs: Partial<T>) => void;
  clientId: string;
  isSelected: boolean;
}

interface BlockSaveProps<T extends BlockAttributes = BlockAttributes> {
  attributes: T;
}

interface BlockSettings {
  attributes?: Record<string, unknown>;
  category?: string;
  edit: ComponentType<BlockEditProps>;
  save: ComponentType<BlockSaveProps>;
  title?: string;
  [key: string]: unknown;
}

interface WPBlocks {
  registerBlockType: (name: string, settings: BlockSettings) => void;
}

interface BlockControlsProps {
  children: ReactNode;
  group?: "default" | "block" | "inline" | "other" | "parent";
}

interface ToolbarGroupProps {
  children: ReactNode;
  className?: string;
}

interface ToolbarButtonProps {
  children?: ReactNode;
  className?: string;
  icon?: ReactNode | string;
  isActive?: boolean;
  label?: string;
  onClick?: (event: React.MouseEvent) => void;
  title?: string;
}

interface DropdownMenuControl {
  title: string;
  icon?: ReactNode | string;
  onClick: () => void;
}

interface DropdownMenuProps {
  children?: (props: { onClose: () => void }) => ReactNode;
  className?: string;
  controls?: DropdownMenuControl[];
  icon?: ReactNode | string;
  label?: string;
  popoverProps?: Record<string, unknown>;
  toggleProps?: Record<string, unknown>;
}

interface TextareaControlProps {
  className?: string;
  help?: string;
  hideLabelFromVision?: boolean;
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  value: string;
}

interface WPBlockEditor {
  BlockControls: ComponentType<BlockControlsProps>;
  useBlockProps: UseBlockProps;
}

interface PopoverProps {
  anchor?: Element | null;
  children: ReactNode;
  focusOnMount?: "firstElement" | "container" | boolean;
  onClose?: () => void;
  onFocusOutside?: (event: Event) => void;
  placement?:
    | "top"
    | "top-start"
    | "top-end"
    | "bottom"
    | "bottom-start"
    | "bottom-end"
    | "left"
    | "right";
  resize?: boolean;
  shift?: boolean;
  className?: string;
}

interface ModalProps {
  children: ReactNode;
  onRequestClose: () => void;
  title?: string;
  isDismissible?: boolean;
  shouldCloseOnClickOutside?: boolean;
  shouldCloseOnEsc?: boolean;
  className?: string;
  overlayClassName?: string;
  isFullScreen?: boolean;
  size?: "small" | "medium" | "large" | "fill";
}

interface ButtonProps {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode | string;
  isDestructive?: boolean;
  isPressed?: boolean;
  label?: string;
  onClick?: (event: React.MouseEvent) => void;
  size?: "default" | "compact" | "small";
  text?: string;
  variant?: "primary" | "secondary" | "tertiary" | "link";
}

interface SearchControlProps {
  className?: string;
  help?: string;
  hideLabelFromVision?: boolean;
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "default" | "compact" | "__unstable-large";
  value: string;
}

interface SelectControlOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectControlProps {
  className?: string;
  help?: string;
  hideLabelFromVision?: boolean;
  label?: string;
  multiple?: boolean;
  onChange: (value: string | string[]) => void;
  options?: SelectControlOption[];
  size?: "default" | "compact" | "__unstable-large";
  value?: string | string[];
}

interface RangeControlProps {
  className?: string;
  help?: string;
  label?: string;
  max?: number;
  min?: number;
  onChange: (value: number | undefined) => void;
  step?: number;
  value?: number;
  withInputField?: boolean;
}

interface ColorPickerProps {
  className?: string;
  color?: string;
  copyFormat?: "hex" | "hsl" | "rgb";
  enableAlpha?: boolean;
  onChange: (color: string) => void;
}

interface PlaceholderProps {
  children?: ReactNode;
  className?: string;
  icon?: ReactNode | string;
  instructions?: string;
  label?: string;
  isColumnLayout?: boolean;
}

interface SpinnerProps {
  className?: string;
}

interface PanelBodyProps {
  children: ReactNode;
  className?: string;
  initialOpen?: boolean;
  title?: string;
}

interface WPComponents {
  Button: ComponentType<ButtonProps>;
  ColorPicker: ComponentType<ColorPickerProps>;
  DropdownMenu: ComponentType<DropdownMenuProps>;
  Modal: ComponentType<ModalProps>;
  PanelBody: ComponentType<PanelBodyProps>;
  Placeholder: ComponentType<PlaceholderProps>;
  Popover: ComponentType<PopoverProps>;
  RangeControl: ComponentType<RangeControlProps>;
  SearchControl: ComponentType<SearchControlProps>;
  SelectControl: ComponentType<SelectControlProps>;
  Spinner: ComponentType<SpinnerProps>;
  TextareaControl: ComponentType<TextareaControlProps>;
  ToolbarButton: ComponentType<ToolbarButtonProps>;
  ToolbarGroup: ComponentType<ToolbarGroupProps>;
}

interface WPMediaAttachment {
  id: number;
  url: string;
  filename: string;
  mime: string;
  subtype: string;
  [key: string]: unknown;
}

interface WPMediaFrame {
  on: (event: string, callback: () => void) => WPMediaFrame;
  open: () => WPMediaFrame;
  state: () => { get: (key: string) => { first: () => { toJSON: () => WPMediaAttachment } } };
}

interface WPMedia {
  (options: {
    title?: string;
    multiple?: boolean;
    library?: Record<string, unknown>;
    button?: { text?: string };
  }): WPMediaFrame;
}

declare global {
  interface Window {
    wp: {
      blockEditor: WPBlockEditor;
      blocks: WPBlocks;
      components: WPComponents;
      media: WPMedia;
    };
  }
}

export type {
  BlockAttributes,
  BlockControlsProps,
  BlockEditProps,
  BlockSaveProps,
  ButtonProps,
  ColorPickerProps,
  DropdownMenuProps,
  ModalProps,
  PlaceholderProps,
  PopoverProps,
  RangeControlProps,
  SearchControlProps,
  SelectControlProps,
  SpinnerProps,
  TextareaControlProps,
  ToolbarButtonProps,
  ToolbarGroupProps,
};
