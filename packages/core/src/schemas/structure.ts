import { z } from "zod";

/** `YYYY-MM-DD`, the format of `<input type="date">` and Postgres `date`. */
const isoDate = z.iso.date("validation.date");

export const academicYearSchema = z
  .object({
    name: z.string().trim().min(2, "validation.name_min").max(40, "validation.name_max"),
    startsOn: isoDate,
    endsOn: isoDate,
  })
  .refine((v) => v.endsOn > v.startsOn, {
    message: "validation.end_after_start",
    path: ["endsOn"],
  });

export type AcademicYearInput = z.infer<typeof academicYearSchema>;

/** Order is managed with move up/down actions, not typed in. */
export const gradeLevelSchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(60, "validation.name_max"),
});

export type GradeLevelInput = z.infer<typeof gradeLevelSchema>;

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "validation.required").max(80, "validation.name_max"),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .max(20, "validation.code_max")
    .regex(/^[A-Z0-9-]*$/, "validation.code_format"),
});

export type SubjectInput = z.infer<typeof subjectSchema>;

export const schoolClassSchema = z.object({
  academicYearId: z.uuid("validation.required"),
  gradeLevelId: z.uuid("validation.required"),
  name: z.string().trim().min(1, "validation.required").max(60, "validation.name_max"),
  /** Empty string = no homeroom teacher (what a cleared <select> submits). */
  homeroomTeacherId: z.union([z.uuid(), z.literal("")]),
});

export type SchoolClassInput = z.infer<typeof schoolClassSchema>;
