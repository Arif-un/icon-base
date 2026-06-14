export interface IconBlockAttributes extends Record<string, unknown> {
  svgContent: string;
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
