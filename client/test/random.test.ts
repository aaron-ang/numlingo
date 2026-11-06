import { describe, expect, it } from "vitest";

import { MAX_NUMBER, numberAt } from "@/utils/random";

describe("numberAt", () => {
  it("is deterministic for a seed", () => {
    const a = Array.from({ length: 20 }, (_, i) => numberAt(42, i));
    const b = Array.from({ length: 20 }, (_, i) => numberAt(42, i));
    expect(a).toEqual(b);
  });

  it("differs between seeds", () => {
    const a = Array.from({ length: 20 }, (_, i) => numberAt(1, i));
    const b = Array.from({ length: 20 }, (_, i) => numberAt(2, i));
    expect(a).not.toEqual(b);
  });

  it("stays within 0..MAX_NUMBER", () => {
    for (let i = 0; i < 500; i++) {
      const n = numberAt(7, i);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(MAX_NUMBER);
    }
  });
});
