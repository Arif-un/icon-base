import type { ReactNode } from "react";

import { __ } from "@/common/helpers/i18nWrap";

export interface WizardStep {
  content: ReactNode;
  key: string;
  title: string;
}

/**
 * Welcome wizard copy.
 *
 * Kept as data so the step list stays cheap to extend — a Collections step slots in here
 * without touching the wizard shell.
 */
export const wizardSteps: WizardStep[] = [
  {
    key: "welcome",
    title: __("Welcome"),
    content: (
      <>
        <p>
          {__(
            "Icon Indexa bundles more than 4,500 SVG icons directly inside WordPress, so you never have to hunt for, upload, or self-host icon files again.",
          )}
        </p>
        <p>
          {__(
            "Every icon is served from your own site. Nothing is fetched from a third-party CDN, and no usage data leaves your server.",
          )}
        </p>
      </>
    ),
  },
  {
    key: "browse",
    title: __("Browse & search"),
    content: (
      <>
        <p>
          {__(
            "Search runs against both icon names and their tags, so searching for “cart” also finds icons tagged for shopping or checkout.",
          )}
        </p>
        <p>
          {__(
            "Narrow results with the Libraries and Types filters, then use the Size, Stroke and Color controls to preview how an icon will look before you use it.",
          )}
        </p>
      </>
    ),
  },
  {
    key: "insert",
    title: __("Use an icon"),
    content: (
      <>
        <p>
          {__(
            "This screen is for browsing. To place an icon on a page, add the Icon Indexa block in the editor and pick your icon there.",
          )}
        </p>
        <p>
          {__(
            "The block is also where you add your own icons — paste SVG code directly, or choose an SVG from the Media Library. Both are sanitized before use.",
          )}
        </p>
      </>
    ),
  },
  {
    key: "finish",
    title: __("You're set"),
    content: (
      <>
        <p>
          {__(
            "That's everything you need. Once an icon is in a post you can restyle it at any time — color, gradient, background, border, rotation, flip and hover effects all live in the block sidebar.",
          )}
        </p>
        <p>
          {__(
            "You can replay the tour of this screen at any time from the Take a tour button in the header.",
          )}
        </p>
      </>
    ),
  },
];
