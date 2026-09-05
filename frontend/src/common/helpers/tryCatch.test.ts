import { describe, expect, it } from "vitest";

import { tryCatch } from "./tryCatch";

describe("tryCatch", () => {
  it("returns data and undefined error when the promise resolves", async () => {
    const result = await tryCatch(Promise.resolve(42));

    expect(result).toEqual({ data: 42, error: undefined });
  });

  it("returns the error and undefined data when the promise rejects", async () => {
    const boom = new Error("boom");
    const result = await tryCatch(Promise.reject(boom));

    expect(result.data).toBeUndefined();
    expect(result.error).toBe(boom);
  });

  it("passes non-Error rejections through as the error value", async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- intentionally testing non-Error rejection passthrough
    const result = await tryCatch<never, string>(Promise.reject("nope"));

    expect(result.error).toBe("nope");
  });
});
