import { describe, expect, it } from "vitest";
import { contrastRatio, readableForeground, safeBrandColor } from "./branding";

describe("branding", () => {
  it("computes the WCAG contrast of black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("picks white text on dark brand colors and dark text on light ones", () => {
    expect(readableForeground("#1f5fd6")).toBe("#ffffff");
    expect(readableForeground("#f6b72c")).toBe("#111827");
  });

  it("falls back when the stored color is invalid", () => {
    expect(safeBrandColor("red", "#123456")).toBe("#123456");
    expect(safeBrandColor("#ABCDEF", "#123456")).toBe("#abcdef");
  });
});
