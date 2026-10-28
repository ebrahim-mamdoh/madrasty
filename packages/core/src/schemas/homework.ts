import { z } from "zod";

/** Mirrors the `homework` bucket's limits (SVG/HTML are refused: they can carry scripts). */
export const HOMEWORK_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
] as const;
export const HOMEWORK_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const HOMEWORK_MAX_FILES = 5;

export function isHomeworkMimeType(type: string): boolean {
  return (HOMEWORK_MIME_TYPES as readonly string[]).includes(type);
}

/** `YYYY-MM-DDTHH:MM`, the value of `<input type="datetime-local">`. */
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "validation.datetime");

/** Empty input → no maximum (the homework is commented on but not scored). */
const optionalScore = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number<string | number>().positive("validation.score_positive").max(999, "validation.score_max").nullable(),
);

export const homeworkSchema = z.object({
  classSubjectId: z.uuid("validation.required"),
  title: z.string().trim().min(2, "validation.name_min").max(150, "validation.name_max"),
  body: z.string().trim().max(5000, "validation.text_max"),
  dueAt: localDateTime,
  maxScore: optionalScore,
});

export type HomeworkInput = z.output<typeof homeworkSchema>;
export type HomeworkFormValues = z.input<typeof homeworkSchema>;

export const submissionSchema = z.object({
  body: z.string().trim().max(5000, "validation.text_max"),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const gradeSchema = z.object({
  score: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number<string | number>().min(0, "validation.score_positive").max(999, "validation.score_max").nullable(),
  ),
  feedback: z.string().trim().max(1000, "validation.feedback_max"),
});

export type GradeInput = z.output<typeof gradeSchema>;
export type GradeFormValues = z.input<typeof gradeSchema>;

export type HomeworkStatus = "pending" | "late" | "submitted" | "graded";

/** Where a student stands on one homework at `now`. */
export function homeworkStatus(
  dueAt: string,
  submission: { gradedAt: string | null } | null,
  now: Date = new Date(),
): HomeworkStatus {
  if (submission?.gradedAt) return "graded";
  if (submission) return "submitted";
  return new Date(dueAt) < now ? "late" : "pending";
}
