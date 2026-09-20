import { describe, expect, it } from "vitest";

import { getAdminTourSteps, TOUR_ANCHOR } from "./tourSteps";

describe("getAdminTourSteps", () => {
  it("returns one step per anchor", () => {
    const steps = getAdminTourSteps(document);

    expect(steps).toHaveLength(Object.keys(TOUR_ANCHOR).length);
  });

  it("resolves each target against the given root", () => {
    const root = document.createElement("div");
    const search = document.createElement("input");
    search.dataset.tour = TOUR_ANCHOR.search;
    root.append(search);

    const steps = getAdminTourSteps(root);
    const searchTarget = steps?.[0].target as () => HTMLElement;

    expect(searchTarget()).toBe(search);
  });

  it("falls back to the document when no root is given", () => {
    const anchor = document.createElement("input");
    anchor.dataset.tour = TOUR_ANCHOR.search;
    document.body.append(anchor);

    const steps = getAdminTourSteps(null);
    const searchTarget = steps?.[0].target as () => HTMLElement;

    expect(searchTarget()).toBe(anchor);

    anchor.remove();
  });
});
