import { afterEach, describe, expect, it, vi } from "vitest";

import { __, sprintf } from "./i18nWrap";

const serverVars = (globalThis as unknown as { SERVER_VARIABLES: { translations: Record<string, string> } })
  .SERVER_VARIABLES;

afterEach(() => {
  serverVars.translations = {};
  (window as unknown as { wp: { i18n: unknown } }).wp.i18n = { __: (s: string) => s, sprintf: (s: string) => s };
});

describe("__", () => {
  it("prefers a server-provided translation when present", () => {
    serverVars.translations = { Hello: "Hola" };
    expect(__("Hello")).toBe("Hola");
  });

  it("returns the original text when wp.i18n is unavailable", () => {
    (window as unknown as { wp: { i18n: unknown } }).wp.i18n = undefined;
    expect(__("Untranslated")).toBe("Untranslated");
  });

  it("falls back to the @wordpress/i18n translator (returns the source string)", () => {
    expect(__("Plain string")).toBe("Plain string");
  });
});

describe("sprintf", () => {
  it("interpolates positional arguments", () => {
    expect(sprintf("Hello %s!", "world")).toBe("Hello world!");
  });

  it("interpolates numeric placeholders", () => {
    expect(sprintf("%d items", 5)).toBe("5 items");
  });

  it("uses the manual placeholder replacement when wp.i18n is unavailable outside test mode", () => {
    vi.stubEnv("MODE", "production");
    (window as unknown as { wp: { i18n: unknown } }).wp.i18n = undefined;

    expect(sprintf("Hi %s, you have %d", "Sam", 3)).toBe("Hi Sam, you have 3");

    vi.unstubAllEnvs();
  });
});
