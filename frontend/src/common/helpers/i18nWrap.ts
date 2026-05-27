/* eslint-disable unicorn/no-typeof-undefined */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { __ as i18n_, sprintf as i18nSprintf } from "@wordpress/i18n";

declare let wp: any;

const __ = (text: string, domain = "icon-base"): string => {
  if (SERVER_VARIABLES.translations?.[text]) {
    return SERVER_VARIABLES.translations[text];
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
