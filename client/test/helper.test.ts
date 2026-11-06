import { describe, expect, it } from "vitest";

import { isEmpty } from "@/utils/helper";

describe("isEmpty", () => {
  it("is true for an object with no keys", () => {
    expect(isEmpty({})).toBe(true);
  });

  it("is false for an object with keys", () => {
    expect(isEmpty({ a: 0 })).toBe(false);
  });
});
