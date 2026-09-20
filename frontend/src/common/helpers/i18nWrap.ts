/* eslint-disable unicorn/no-typeof-undefined */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { __ as i18n_, sprintf as i18nSprintf } from "@wordpress/i18n";

declare let wp: any;

// SERVER_VARIABLES is a compile-time constant replaced with the localized WP global. Not
// every consumer applies that define (Storybook's builder does not, and vite.config.ts skips
// it in test mode), so read it defensively rather than assuming it resolves to an object.
const serverVariables = (): typeof SERVER_VARIABLES | undefined =>
  typeof SERVER_VARIABLES === "undefined" ? undefined : SERVER_VARIABLES;

const __ = (text: string, domain = "icon-indexa"): string => {
  const translated = serverVariables()?.translations?.[text];

  if (translated) {
    return translated;
  }

  if (typeof wp !== "undefined" && !wp?.i18n) {
    return text;
  }

  return i18n_(text, domain);
};

const sprintf = (text: string, ...vars: any[]) => {
  if (import.meta.env.MODE !== "test" && !wp?.i18n) {
    const matches: any = text.match(/%[ E-GXb-gosux]/g);
    let str = text;
    vars.map((val: any, idx: number) => {
      str = str.replace(matches[idx], val);
    });

    return str;
  }

  return (i18nSprintf as (...args: any[]) => string)(text, ...vars);
};

export { __, sprintf };
