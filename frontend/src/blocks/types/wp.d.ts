interface UseBlockPropsReturn {
  className: string;
  [key: string]: unknown;
}

interface UseBlockProps {
  (props?: Record<string, unknown>): UseBlockPropsReturn;
  save: (props?: Record<string, unknown>) => UseBlockPropsReturn;
}

interface BlockSettings {
  attributes?: Record<string, unknown>;
  category?: string;
  edit: () => JSX.Element;
  save: () => JSX.Element;
  title?: string;
  [key: string]: unknown;
}

interface WPBlocks {
  registerBlockType: (name: string, settings: BlockSettings) => void;
}

interface WPBlockEditor {
  useBlockProps: UseBlockProps;
}

declare global {
  interface Window {
    wp: {
      blockEditor: WPBlockEditor;
      blocks: WPBlocks;
    };
  }
}

export {};
