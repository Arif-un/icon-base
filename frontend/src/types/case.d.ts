/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * snake_case to camelCase
 */
type SnakeToCamel<T extends string> = T extends `${infer F}_${infer R}`
  ? `${Lowercase<F>}${Capitalize<SnakeToCamel<R>>}`
  : T

type CamelKeys<T extends object> = {
  [key in keyof T as key extends string ? SnakeToCamel<key> : key]: T[key]
}

type DeepCamelKeys<T> = T extends readonly any[]
  ? { [I in keyof T]: DeepCamelKeys<T[I]> }
  : T extends object
    ? {
        [K in keyof T as K extends string ? SnakeToCamel<K> : K]: DeepCamelKeys<T[K]>
      }
    : T

/**
 * cameCase to snake_case
 *  */
type CamelToSnake<T extends string, A extends string = ''> = T extends `${infer F}${infer R}`
  ? CamelToSnake<R, `${A}${F extends Lowercase<F> ? F : `_${Lowercase<F>}`}`>
  : A

type SnakeKeys<T extends Record<string, any>> = {
  [K in keyof T as CamelToSnake<K & string>]: T[K]
}

type DeepSnakeKeys<T> = T extends readonly any[]
  ? { [I in keyof T]: DeepSnakeKeys<T[I]> }
  : T extends object
    ? {
        [K in keyof T as K extends string ? CamelToSnake<K> : K]: DeepSnakeKeys<T[K]>
      }
    : T
