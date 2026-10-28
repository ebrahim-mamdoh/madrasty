import { z } from "zod";

export const EXAM_KINDS = ["monthly", "midterm", "final", "quiz"] as const;
export type ExamKind = (typeof EXAM_KINDS)[number];

export const EXAM_MODES = ["paper", "online"] as const;
export type ExamMode = (typeof EXAM_MODES)[number];

export const EXAM_STATUSES = ["draft", "pending", "approved", "published"] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

export const QUESTION_TYPES = ["mcq", "true_false", "short"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const MAX_MCQ_OPTIONS = 6;

/** `YYYY-MM-DDTHH:MM`, the value of `<input type="datetime-local">`. */
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "validation.datetime");

const positiveNumber = (max: number) =>
  z.coerce
    .number<string | number>()
    .positive("validation.score_positive")
    .max(max, "validation.score_max");

export const examSchema = z.object({
  classSubjectId: z.uuid("validation.required"),
  title: z.string().trim().min(2, "validation.name_min").max(150, "validation.name_max"),
  kind: z.enum(EXAM_KINDS),
  mode: z.enum(EXAM_MODES),
  startsAt: localDateTime,
  durationMinutes: z.coerce
    .number<string | number>()
    .int("validation.duration")
    .min(5, "validation.duration")
    .max(300, "validation.duration"),
  maxScore: positiveNumber(999),
  instructions: z.string().trim().max(2000, "validation.text_max"),
});

export type ExamInput = z.output<typeof examSchema>;
export type ExamFormValues = z.input<typeof examSchema>;

/**
 * One question as typed in the editor. `correct` is the option index (MCQ), "true"/"false"
 * (true/false) or ignored (short answer, graded by the teacher).
 */
export const questionSchema = z
  .object({
    type: z.enum(QUESTION_TYPES),
    text: z.string().trim().min(1, "validation.required").max(2000, "validation.text_max"),
    options: z.array(z.string().trim().max(300, "validation.text_max")),
    correct: z.string(),
    points: positiveNumber(100),
  })
  .superRefine((value, ctx) => {
    if (value.type === "mcq") {
      const filled = value.options.filter(Boolean);
      if (filled.length < 2 || filled.length !== value.options.length) {
        ctx.addIssue({ code: "custom", message: "validation.mcq_options", path: ["options"] });
      }
      const index = Number(value.correct);
      if (value.correct === "" || !Number.isInteger(index) || index < 0 || index >= value.options.length) {
        ctx.addIssue({ code: "custom", message: "validation.mcq_correct", path: ["correct"] });
      }
    }
    if (value.type === "true_false" && value.correct !== "true" && value.correct !== "false") {
      ctx.addIssue({ code: "custom", message: "validation.tf_correct", path: ["correct"] });
    }
  });

export type QuestionFormValues = z.input<typeof questionSchema>;
export type QuestionFormOutput = z.output<typeof questionSchema>;

/** What the database stores for a question (`correct_answer` jsonb). */
export type QuestionInput = {
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: number | boolean | null;
  points: number;
};

export function toQuestionInput(values: QuestionFormOutput): QuestionInput {
  return {
    type: values.type,
    text: values.text,
    options: values.type === "mcq" ? values.options : [],
    correctAnswer:
      values.type === "mcq"
        ? Number(values.correct)
        : values.type === "true_false"
          ? values.correct === "true"
          : null,
    points: values.points,
  };
}

export const rejectSchema = z.object({
  note: z.string().trim().min(3, "validation.reason_required").max(500, "validation.text_max"),
});

export type RejectInput = z.infer<typeof rejectSchema>;

/** A typed score cell: empty means "no result", otherwise 0…max. */
export function parseScore(value: string, max: number): number | null | "invalid" {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const score = Number(trimmed);
  if (!Number.isFinite(score) || score < 0 || score > max) return "invalid";
  return Math.round(score * 100) / 100;
}
