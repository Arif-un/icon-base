declare module "*.module.css";
declare module "*.module.scss";
declare module "*.module.sass";
declare module "*.svg";
declare module "*.png";
declare module "*.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let wp: any;
declare const VITE_PLUGIN_HAS_SUBMODULE_UPDATES: boolean;

type WPStarterKitPromise<T> = Promise<T>;

declare const SERVER_VARIABLES: {
  ajaxURL: string;
  apiURL: {
    base: string;
    separator: string;
  };
  assetsURL: string;
  dateFormat: string;
  key?: string;
  loggedInUserName: string;
  nonce: string;
  pluginAdminURL: string;
  pluginSlug: string;
  redirectUri: string;
  restNonce: string;
  rootURL: string;
  routePrefix: string;
  settings: string;
  siteBaseURL: string;
  siteURL: string;
  timeFormat: string;
  timeZone: string;
  translations?: Record<string, string>;
  uploadBaseUrl: string;
  version: string;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type Builtin = Date | Error | Function | Primitive | RegExp;

type CommonObjectValue =
  | boolean
  | CommonObjectValue[]
  | null
  | number
  | Record<string, CommonObjectValue>
  | string
  | undefined;

type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends WeakMap<infer K, infer V>
        ? WeakMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends Set<infer U>
          ? ReadonlySet<DeepReadonly<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepReadonly<U>>
            : T extends WeakSet<infer U>
              ? WeakSet<DeepReadonly<U>>
              : T extends WPStarterKitPromise<infer U>
                ? WPStarterKitPromise<DeepReadonly<U>>
                : T extends object
                  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                  : T;

type KeyedValueHandler<T> = <K extends keyof T>(key: K, value: T[K]) => void;

type NestedKeyOf<T> = {
  [K in keyof T]: T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` | `${K}` : `${K}`;
}[keyof T];

type Primitive = bigint | boolean | null | number | string | symbol | undefined;

type ValidationType<T> = Record<NestedKeyOf<T>, string[]>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
