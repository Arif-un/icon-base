export interface IconBlockAttributes extends Record<string, unknown> {
  svgContent: string;
  svgNormalizeColors: boolean;
  // True only for SVGs authored through the custom-SVG modal - gates the Edit toolbar button so it
  // is not offered for media-library/library icons, whose original colors are stripped at insert
  // and can't be recovered by re-inserting (the modal's "keep original colors" advice is false for
  // them). Optional: blocks saved before this flag existed simply fall back to false.
  isCustomSvg?: boolean;
  iconId: number;
  iconName: string;
  iconFilename: string;
  librarySlug: string;
  libraryDir: string;
  width: string;
  height: string;
  strokeWidth: number;
  iconColor: string;
  customIconColor: string;
  iconBackgroundColor: string;
  customIconBackgroundColor: string;
  gradient: string;
  customGradient: string;
  iconWidth: number;
  iconHeight: number;
  rotate: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  linkUrl: string;
  linkTarget: string;
  linkRel: string;
  label: string;
  title: string;
  itemsJustification: string;
  hoverEffect: string;
}

export interface SelectedIconData {
  svgContent: string;
  iconId: number;
  iconName: string;
  iconFilename: string;
  librarySlug: string;
  libraryDir: string;
  iconWidth: number;
  iconHeight: number;
}
