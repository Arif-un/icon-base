import { afterEach, describe, expect, it, vi } from "vitest";

import { syncWpBackground } from "./syncWpBackground";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("syncWpBackground", () => {
  it("does nothing when the admin menu background element is absent", () => {
    document.body.innerHTML = `<div id="wpwrap"></div>`;

    expect(() => syncWpBackground()).not.toThrow();
    const wpWrap = document.getElementById("wpwrap")!;
    expect(wpWrap.style.backgroundColor).toBe("");
  });

  it("copies the computed background color to wpwrap and clears the menu background", () => {
    document.body.innerHTML = `<div id="adminmenuback"></div><div id="wpwrap"></div>`;
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "rgb(1, 2, 3)",
    } as unknown as CSSStyleDeclaration);

    syncWpBackground();

    expect(document.getElementById("wpwrap")!.style.backgroundColor).toBe("rgb(1, 2, 3)");
    expect(document.getElementById("adminmenuback")!.style.backgroundColor).toBe("transparent");
  });

  it("returns early when the computed background color is empty", () => {
    document.body.innerHTML = `<div id="adminmenuback"></div><div id="wpwrap"></div>`;
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "",
    } as unknown as CSSStyleDeclaration);

    syncWpBackground();

    expect(document.getElementById("wpwrap")!.style.backgroundColor).toBe("");
  });

  it("does not throw when wpwrap is missing but a background color exists", () => {
    document.body.innerHTML = `<div id="adminmenuback"></div>`;
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: () => "rgb(9, 9, 9)",
    } as unknown as CSSStyleDeclaration);

    expect(() => syncWpBackground()).not.toThrow();
    expect(document.getElementById("adminmenuback")!.style.backgroundColor).toBe("transparent");
  });
});
