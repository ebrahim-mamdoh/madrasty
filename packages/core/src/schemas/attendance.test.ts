import { describe, expect, it } from "vitest";
import { attendanceRate, saveAttendanceSchema } from "./attendance";

describe("attendanceRate", () => {
  it("counts present and late as attending", () => {
    expect(attendanceRate({ present: 15, late: 3, absent: 1, excused: 1 })).toBe(90);
  });

  it("is null before anything is recorded", () => {
    expect(attendanceRate({ present: 0, late: 0, absent: 0, excused: 0 })).toBeNull();
  });
});

describe("saveAttendanceSchema", () => {
  const base = {
    classId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
    date: "2026-10-28",
    entries: [{ studentId: "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", status: "absent", note: " sick " }],
  };

  it("accepts a day and trims notes", () => {
    const result = saveAttendanceSchema.safeParse(base);
    expect(result.success).toBe(true);
    expect(result.data?.entries[0]?.note).toBe("sick");
  });

  it("rejects unknown statuses and empty sheets", () => {
    expect(
      saveAttendanceSchema.safeParse({
        ...base,
        entries: [{ ...base.entries[0], status: "sleeping" }],
      }).success,
    ).toBe(false);
    expect(saveAttendanceSchema.safeParse({ ...base, entries: [] }).success).toBe(false);
  });
});
