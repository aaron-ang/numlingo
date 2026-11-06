import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LanguageMenu from "@/components/LanguageMenu";
import { numToString } from "@/utils/numberConverter";

describe("numToString", () => {
  it("converts English", () => {
    expect(numToString(42, "en")).toBe("forty-two");
  });

  it("supports every locale offered in the language menu", () => {
    const { container } = render(
      <LanguageMenu selectOption={() => {}} currentLocale="en" />,
    );
    const locales = [...container.querySelectorAll("button")].map(
      (b) => b.dataset.locale!,
    );
    expect(locales.length).toBeGreaterThan(0);
    for (const locale of locales) {
      for (const n of [0, 7, 15, 99, 100, 101, 999]) {
        expect(numToString(n, locale), `${locale} ${n}`).not.toBe("");
      }
    }
  });

  it("throws on an unsupported locale", () => {
    expect(() => numToString(1, "xx")).toThrow("Unsupported locale: xx");
  });

  it("uses colloquial Chinese forms", () => {
    expect(numToString(15, "zh")).toBe("十五");
    expect(numToString(200, "zh")).toBe("两百");
  });

  it("uses Cyrillic і in Ukrainian", () => {
    expect(numToString(3, "uk")).not.toMatch(/i/);
  });

  it("strips hyphens in Norwegian and Swedish", () => {
    expect(numToString(21, "nb")).not.toContain("-");
    expect(numToString(121, "sv")).not.toMatch(/-| och /);
  });
});
