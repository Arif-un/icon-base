 
/* eslint-disable unicorn/no-typeof-undefined */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { __ as i18n_, sprintf as i18nSprintf } from '@wordpress/i18n'

// declare let bitapp: any
declare let wp: any
// declare var bitapp: any

const __ = (text: string, domain = 'wp-starter-kit'): string => {
  if (SERVER_VARIABLES?.translations?.[text]) {
    return SERVER_VARIABLES.translations[text]
  }

  if (typeof wp !== 'undefined' && !wp?.i18n) {
    return text
  }

  return i18n_(text, domain)
}

const sprintf = (text: string, ...vars: any) => {
  if (import.meta.env.MODE !== 'test' && !wp?.i18n) {
    const matches: any = text.match(/%[ E-GXb-gosux]/g)
    let str = text
    vars.map((val: any, idx: number) => {
      str = str.replace(matches[idx], val)
    })

    return str
  }

  return i18nSprintf(text, ...vars)
}

export { __, sprintf }
