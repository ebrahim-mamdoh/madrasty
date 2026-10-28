import { describe, expect, it } from "vitest";
import { gradeSchema, homeworkSchema, homeworkStatus } from "./homework";

const base = {
  classSubjectId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  title: "  Chapter 3 exercises ",
  body: "",
  dueAt: "2026-11-02T20:00",
  maxScore: "",
};

describe("homeworkSchema", () => {
  it("trims the title and treats an empty max score as unscored", () => {
    const result = homeworkSchema.safeParse(base);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ title: "Chapter 3 exercises", maxScore: null });
  });

  it("coerces a typed max score and rejects non-positive ones", () => {
    expect(homeworkSchema.safeParse({ ...base, maxScore: "10" }).data?.maxScore).toBe(10);
    expect(homeworkSchema.safeParse({ ...base, maxScore: "0" }).success).toBe(false);
  });

  it("requires a datetime-local due date", () => {
    expect(homeworkSchema.safeParse({ ...base, dueAt: "2026-11-02" }).success).toBe(false);
  });
});

describe("gradeSchema", () => {
  it("allows feedback without a score", () => {
    expect(gradeSchema.safeParse({ score: "", feedback: "Well done" }).data).toEqual({
      score: null,
      feedback: "Well done",
    });
  });
});

describe("homeworkStatus", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  it("derives pending / late / submitted / graded", () => {
    expect(homeworkStatus("2026-11-02T12:00:00Z", null, now)).toBe("pending");
    expect(homeworkStatus("2026-10-31T12:00:00Z", null, now)).toBe("late");
    expect(homeworkStatus("2026-10-31T12:00:00Z", { gradedAt: null }, now)).toBe("submitted");
    expect(homeworkStatus("2026-10-31T12:00:00Z", { gradedAt: "2026-11-01" }, now)).toBe("graded");
  });
});
