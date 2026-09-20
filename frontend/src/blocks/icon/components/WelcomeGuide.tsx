import type { ReactNode } from "react";

import { __ } from "@/common/helpers/i18nWrap";
import Logo from "@/components/Logo";

const { Guide } = window.wp.components;

/**
 * Decorative header for a guide page. Composed from existing pieces rather than shipping
 * screenshots — the wp.org zip is already large, and bitmaps would date badly.
 */
function Illustration({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center gap-3 bg-[#f0f0f0] text-[#1e1e1e]">
      <Logo size={40} />
      <span className="text-base font-semibold">{children}</span>
    </div>
  );
}

/** Core's Guide renders page content unstyled and full-bleed; this keeps the copy readable. */
function Copy({ children }: { children: ReactNode }) {
  return <div className="ib-guide-copy">{children}</div>;
}

export default function WelcomeGuide({ onFinish }: { onFinish: () => void }) {
  return (
    <Guide
      className="ib-welcome-guide"
      contentLabel={__("Welcome to the Icon Indexa block")}
      finishButtonText={__("Get started")}
      onFinish={onFinish}
      pages={[
        {
          image: <Illustration>{__("Icon Indexa")}</Illustration>,
          content: (
            <Copy>
              <h2>{__("Icons, without the hunt")}</h2>
              <p>
                {__(
                  "This block places any of the 4,500+ bundled SVG icons straight into your content. Icons are inlined, so they stay sharp at any size and inherit the colors you set.",
                )}
              </p>
            </Copy>
          ),
        },
        {
          image: <Illustration>{__("Pick an icon")}</Illustration>,
          content: (
            <Copy>
              <h2>{__("Three ways to choose")}</h2>
              <p>
                {__(
                  "Browse Icon opens the searchable library, filtered by icon set and style. Media Library uses an SVG you have already uploaded. Insert Custom SVG lets you paste markup directly.",
                )}
              </p>
              <p>
                {__(
                  "Custom SVGs are sanitized before use: scripts and event handlers are stripped, and files that embed a bitmap are rejected.",
                )}
              </p>
            </Copy>
          ),
        },
        {
          image: <Illustration>{__("Make it yours")}</Illustration>,
          content: (
            <Copy>
              <h2>{__("Style it in the sidebar")}</h2>
              <p>
                {__(
                  "The block sidebar controls size, stroke width, color, gradient, background, border, padding and margin, plus a hover effect.",
                )}
              </p>
              <p>
                {__(
                  "If an icon ignores your color settings, its SVG has hard-coded fill values, which the plugin deliberately preserves.",
                )}
              </p>
            </Copy>
          ),
        },
        {
          image: <Illustration>{__("Link and align")}</Illustration>,
          content: (
            <Copy>
              <h2>{__("Finish up in the toolbar")}</h2>
              <p>
                {__(
                  "Use the block toolbar to turn an icon into a link, rotate it a full 360 degrees, flip it horizontally or vertically, and set its alignment.",
                )}
              </p>
              <p>
                {__(
                  "You can reopen this guide at any time from the Help panel in the block sidebar.",
                )}
              </p>
            </Copy>
          ),
        },
      ]}
    />
  );
}
