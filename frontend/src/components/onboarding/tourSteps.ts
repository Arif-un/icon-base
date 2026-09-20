import type { TourProps } from "antd";

import { __ } from "@/common/helpers/i18nWrap";

/**
 * Tour anchors are found by attribute rather than by ref: the targets are split across the
 * root layout (the Take a tour button) and the route (search and filters), and refs may not
 * be read during render.
 */
export const TOUR_ANCHOR = {
  libraryFilter: "library-filter",
  previewControls: "preview-controls",
  search: "search",
  tourButton: "tour-button",
  typeFilter: "type-filter",
} as const;

export type TourAnchor = (typeof TOUR_ANCHOR)[keyof typeof TOUR_ANCHOR];

/**
 * @param root Where to look for anchors — the shadow root in the admin app, since the
 *   elements are not in the main document tree.
 *
 * Placements are pinned rather than left to antd. Its default centers a 520px popover on the
 * target and only auto-adjusts against the viewport, not against our container — so a step
 * anchored near the left of the screen renders underneath the WordPress admin sidebar.
 * Aligning left-hand steps to bottomLeft and right-hand steps to bottomRight keeps every
 * popover inside the plugin's own content area.
 */
export function getAdminTourSteps(root: ParentNode | null): TourProps["steps"] {
  // rc-tour types `target` as `(() => HTMLElement) | (() => null)` rather than
  // `() => HTMLElement | null`, hence the assertion. A missing anchor yields null, which
  // rc-tour handles by rendering the step centered instead of throwing.
  const anchor = (name: TourAnchor) => () =>
    (root ?? document).querySelector(`[data-tour="${name}"]`) as HTMLElement;

  return [
    {
      title: __("Search every icon"),
      description: __(
        "Type to search across every bundled icon by name and by tag. Results update as you type.",
      ),
      target: anchor(TOUR_ANCHOR.search),
      placement: "bottomLeft",
    },
    {
      title: __("Filter by library"),
      description: __("Limit results to one or more icon sets, such as Ant Design or Boxicons."),
      target: anchor(TOUR_ANCHOR.libraryFilter),
      placement: "bottomLeft",
    },
    {
      title: __("Filter by style"),
      description: __(
        "Narrow further by variant — outlined, filled, two-tone, solid, regular or logo.",
      ),
      target: anchor(TOUR_ANCHOR.typeFilter),
      placement: "bottomLeft",
    },
    {
      title: __("Preview before you use"),
      description: __(
        "Adjust size, stroke width and color to see how an icon will look. These controls change the preview on this screen only — the icon itself is styled in the block.",
      ),
      target: anchor(TOUR_ANCHOR.previewControls),
      placement: "bottomRight",
    },
    {
      title: __("Replay this any time"),
      description: __("Reopen this tour whenever you need it from the Take a tour button."),
      target: anchor(TOUR_ANCHOR.tourButton),
      placement: "bottomRight",
    },
  ];
}
