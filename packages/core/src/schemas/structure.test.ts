import { describe, expect, it } from "vitest";
import { academicYearSchema, schoolClassSchema, subjectSchema } from "./structure";

describe("academicYearSchema", () => {
  it("accepts a valid year", () => {
    const result = academicYearSchema.safeParse({
      name: "2026/2027",
      startsOn: "2026-09-01",
      endsOn: "2027-06-30",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an end date that is not after the start date, on the endsOn field", () => {
    const result = academicYearSchema.safeParse({
      name: "2026/2027",
      startsOn: "2026-09-01",
      endsOn: "2026-09-01",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["endsOn"],
      message: "validation.end_after_start",
    });
  });

  it("rejects malformed dates", () => {
    const result = academicYearSchema.safeParse({
      name: "2026",
      startsOn: "01/09/2026",
      endsOn: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("subjectSchema", () => {
  it("normalizes the code to upper case", () => {
    expect(subjectSchema.parse({ name: "رياضيات", code: " math-1 " }).code).toBe("MATH-1");
  });

  it("allows an empty code", () => {
    expect(subjectSchema.parse({ name: "رياضيات", code: "" }).code).toBe("");
  });

  it("rejects codes with spaces or symbols", () => {
    expect(subjectSchema.safeParse({ name: "رياضيات", code: "MA TH" }).success).toBe(false);
  });
});

describe("schoolClassSchema", () => {
  const base = {
    academicYearId: "6f1c2a52-7f0e-4c8c-9a40-0a4f5b0f3c11",
    gradeLevelId: "1b7e5d2e-2a4c-4f0d-8b51-5f8f8d4f2e10",
    name: "1/أ",
  };

  it("accepts no homeroom teacher as an empty string", () => {
    expect(schoolClassSchema.safeParse({ ...base, homeroomTeacherId: "" }).success).toBe(true);
  });

  it("rejects a missing grade level", () => {
    const result = schoolClassSchema.safeParse({
      ...base,
      gradeLevelId: "",
      homeroomTeacherId: "",
    });
    expect(result.success).toBe(false);
  });
});
