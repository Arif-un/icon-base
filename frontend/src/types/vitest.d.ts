/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import 'vitest'

interface CustomMatchers<R = unknown> {
  toEqualIgnoreKeyAndOperators: (expected: AnyObject, ignoredKeys: string[]) => R
  toEqualIgnoringKey: (expected: AnyObject, ignoredKeys: string[]) => R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers<void> {}
}
