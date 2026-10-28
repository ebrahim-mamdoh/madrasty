import { describe, expect, it } from "vitest";
import { monthStart, reportSchema } from "./reports";

describe("reportSchema", () => {
  it("accepts partial ratings and trims notes", () => {
    const result = reportSchema.safeParse({
      ratings: { behavior: 5, participation: 3 },
      academicNote: "  Good progress ",
      behaviorNote: "",
    });
    expect(result.success).toBe(true);
    expect(result.data?.academicNote).toBe("Good progress");
  });

  it("rejects out-of-range ratings and unknown criteria", () => {
    expect(reportSchema.safeParse({ ratings: { behavior: 6 }, academicNote: "", behaviorNote: "" }).success).toBe(false);
    expect(reportSchema.safeParse({ ratings: { mood: 3 }, academicNote: "", behaviorNote: "" }).success).toBe(false);
  });
});

describe("monthStart", () => {
  it("stores a month as its first day", () => {
    expect(monthStart("2026-10")).toBe("2026-10-01");
    expect(monthStart("2026-10-17")).toBe("2026-10-01");
  });
});
