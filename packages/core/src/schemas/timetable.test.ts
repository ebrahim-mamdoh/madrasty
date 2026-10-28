import { describe, expect, it } from "vitest";
import { orderStudyDays, periodSchema, studyDaysSchema } from "./timetable";

describe("periodSchema", () => {
  it("accepts a period and coerces the number typed in a form", () => {
    const result = periodSchema.safeParse({ number: "3", startsAt: "09:30", endsAt: "10:15" });
    expect(result.success).toBe(true);
    expect(result.data?.number).toBe(3);
  });

  it("rejects an end time that is not after the start, on the endsAt field", () => {
    const result = periodSchema.safeParse({ number: 1, startsAt: "10:00", endsAt: "09:00" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["endsAt"],
      message: "validation.end_after_start_time",
    });
  });

  it("rejects malformed times and out-of-range numbers", () => {
    expect(periodSchema.safeParse({ number: 1, startsAt: "8:00", endsAt: "09:00" }).success).toBe(
      false,
    );
    expect(periodSchema.safeParse({ number: 0, startsAt: "08:00", endsAt: "09:00" }).success).toBe(
      false,
    );
    expect(periodSchema.safeParse({ number: 21, startsAt: "08:00", endsAt: "09:00" }).success).toBe(
      false,
    );
  });
});

describe("studyDaysSchema", () => {
  it("requires at least one day within 0–6", () => {
    expect(studyDaysSchema.safeParse([0, 1, 2, 3, 4]).success).toBe(true);
    expect(studyDaysSchema.safeParse([]).success).toBe(false);
    expect(studyDaysSchema.safeParse([7]).success).toBe(false);
  });
});

describe("orderStudyDays", () => {
  it("starts the week right after the weekend", () => {
    expect(orderStudyDays([0, 1, 2, 3, 4])).toEqual([0, 1, 2, 3, 4]);
    expect(orderStudyDays([4, 3, 2, 1, 0, 6])).toEqual([6, 0, 1, 2, 3, 4]);
    expect(orderStudyDays([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
    expect(orderStudyDays([5])).toEqual([5]);
  });
});
