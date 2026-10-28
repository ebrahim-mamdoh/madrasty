import {
  AppError,
  type BankQuestion,
  type Exam,
  type ExamAnswers,
  type ExamInput,
  type ExamPaper,
  type ExamQuestion,
  type ExamResultEntry,
  type ExamStatus,
  type QuestionInput,
  type StudentExam,
  type StudentGrade,
} from "@madrasty/core";
import type { Json } from "../database.types";
import type { TypedSupabaseClient } from "../client";
import { unwrap } from "../errors";

const EXAM_COLUMNS = `id, title, kind, mode, starts_at, duration_minutes, max_score, instructions, status,
  review_note, class_id, class_subject_id, published_at,
  class:classes!exams_class_fkey(name),
  class_subject:class_subjects!exams_class_subject_fkey(subject:subjects(id, name))`;

const QUESTION_COLUMNS = "id, position, type, text, options, correct_answer, points";

/** Exam input with `startsAt` as an ISO timestamp (converted from the form's local time by the UI). */
export type ExamWrite = Omit<ExamInput, "startsAt"> & { startsAt: string };

export type ExamTransition = "submit" | "approve" | "reject" | "publish";

type ExamRow = {
  id: string;
  title: string;
  kind: Exam["kind"];
  mode: Exam["mode"];
  starts_at: string;
  duration_minutes: number;
  max_score: number;
  instructions: string;
  status: ExamStatus;
  review_note: string | null;
  class_id: string;
  class_subject_id: string;
  published_at: string | null;
  class: { name: string };
  class_subject: { subject: { id: string; name: string } };
};

function toExam(row: ExamRow): Exam {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    mode: row.mode,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    maxScore: Number(row.max_score),
    instructions: row.instructions,
    status: row.status,
    reviewNote: row.review_note,
    classId: row.class_id,
    className: row.class.name,
    classSubjectId: row.class_subject_id,
    subjectId: row.class_subject.subject.id,
    subjectName: row.class_subject.subject.name,
    publishedAt: row.published_at,
  };
}

function toOptions(value: Json): string[] {
  return Array.isArray(value) ? value.map((option) => String(option)) : [];
}

function toCorrect(value: Json | null): number | boolean | null {
  return typeof value === "number" || typeof value === "boolean" ? value : null;
}

type QuestionRow = {
  id: string;
  position: number;
  type: ExamQuestion["type"];
  text: string;
  options: Json;
  correct_answer: Json | null;
  points: number;
};

function toQuestion(row: QuestionRow): ExamQuestion {
  return {
    id: row.id,
    position: row.position,
    type: row.type,
    text: row.text,
    options: toOptions(row.options),
    correctAnswer: toCorrect(row.correct_answer),
    points: Number(row.points),
  };
}

function toAnswers(value: Json): ExamAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number | boolean | string] =>
        ["number", "boolean", "string"].includes(typeof entry[1]),
    ),
  );
}

function questionRow(input: QuestionInput) {
  return {
    type: input.type,
    text: input.text,
    options: input.options,
    correct_answer: input.correctAnswer,
    points: input.points,
  };
}

/**
 * Exams, questions, the online exam room and results. The DB owns the lifecycle
 * (exam_transition), hides questions from students (start_exam hands out a paper without
 * answers) and decides who may record or see results.
 */
export function createExamsService(client: TypedSupabaseClient) {
  async function currentYearId(): Promise<string | null> {
    const year = unwrap(
      await client.from("academic_years").select("id").eq("is_current", true).maybeSingle(),
    );
    return year?.id ?? null;
  }

  return {
    /** The teacher's exams this year (all statuses), soonest first. */
    async listForTeacher(teacherId: string): Promise<Exam[]> {
      const yearId = await currentYearId();
      if (!yearId) return [];
      const rows = unwrap(
        await client
          .from("exams")
          .select(
            `${EXAM_COLUMNS}, scope:class_subjects!exams_class_subject_fkey!inner(teacher_id), year:classes!exams_class_fkey!inner(academic_year_id)`,
          )
          .eq("scope.teacher_id", teacherId)
          .eq("year.academic_year_id", yearId)
          .order("starts_at", { ascending: false }),
      );
      return rows.map(toExam);
    },

    /** Admin list, optionally narrowed to one status (e.g. waiting for approval). */
    async listForSchool(status?: ExamStatus): Promise<Exam[]> {
      const yearId = await currentYearId();
      if (!yearId) return [];
      let query = client
        .from("exams")
        .select(`${EXAM_COLUMNS}, year:classes!exams_class_fkey!inner(academic_year_id)`)
        .eq("year.academic_year_id", yearId)
        .order("starts_at", { ascending: false });
      if (status) query = query.eq("status", status);
      return unwrap(await query).map(toExam);
    },

    /** The student's class exams (approved or published) with their attempt and published score. */
    async listForStudent(studentId: string, classId: string): Promise<StudentExam[]> {
      const [rows, attempts, results] = await Promise.all([
        client
          .from("exams")
          .select(EXAM_COLUMNS)
          .eq("class_id", classId)
          .in("status", ["approved", "published"])
          .order("starts_at", { ascending: true })
          .then(unwrap),
        client
          .from("exam_attempts")
          .select("exam_id, submitted_at")
          .eq("student_id", studentId)
          .then(unwrap),
        client.from("exam_results").select("exam_id, score").eq("student_id", studentId).then(unwrap),
      ]);
      const attemptByExam = new Map(attempts.map((a) => [a.exam_id, a.submitted_at]));
      const scoreByExam = new Map(results.map((r) => [r.exam_id, Number(r.score)]));
      return rows.map((row) => ({
        ...toExam(row),
        attemptSubmittedAt: attemptByExam.get(row.id) ?? null,
        score: scoreByExam.get(row.id) ?? null,
      }));
    },

    async get(id: string): Promise<Exam> {
      const row = unwrap(await client.from("exams").select(EXAM_COLUMNS).eq("id", id).maybeSingle());
      if (!row) throw new AppError("not_found");
      return toExam(row);
    },

    async create(schoolId: string, classId: string, input: ExamWrite): Promise<string> {
      const { id } = unwrap(
        await client
          .from("exams")
          .insert({
            school_id: schoolId,
            class_id: classId,
            class_subject_id: input.classSubjectId,
            title: input.title,
            kind: input.kind,
            mode: input.mode,
            starts_at: input.startsAt,
            duration_minutes: input.durationMinutes,
            max_score: input.maxScore,
            instructions: input.instructions,
          })
          .select("id")
          .single(),
      );
      return id;
    },

    /** Drafts only (RLS). */
    async update(id: string, input: Omit<ExamWrite, "classSubjectId">): Promise<void> {
      const rows = unwrap(
        await client
          .from("exams")
          .update({
            title: input.title,
            kind: input.kind,
            mode: input.mode,
            starts_at: input.startsAt,
            duration_minutes: input.durationMinutes,
            max_score: input.maxScore,
            instructions: input.instructions,
          })
          .eq("id", id)
          .select("id"),
      );
      if (rows.length === 0) throw new AppError("forbidden");
    },

    async remove(id: string): Promise<void> {
      const rows = unwrap(await client.from("exams").delete().eq("id", id).select("id"));
      if (rows.length === 0) throw new AppError("forbidden");
    },

    async transition(id: string, action: ExamTransition, note?: string): Promise<ExamStatus> {
      return unwrap(
        await client.rpc("exam_transition", { p_exam_id: id, p_action: action, p_note: note }),
      );
    },

    // ------------------------------------------------------------ questions
    async listQuestions(examId: string): Promise<ExamQuestion[]> {
      const rows = unwrap(
        await client
          .from("exam_questions")
          .select(QUESTION_COLUMNS)
          .eq("exam_id", examId)
          .order("position")
          .order("created_at"),
      );
      return rows.map(toQuestion);
    },

    async addQuestion(schoolId: string, examId: string, position: number, input: QuestionInput) {
      unwrap(
        await client
          .from("exam_questions")
          .insert({ school_id: schoolId, exam_id: examId, position, ...questionRow(input) }),
      );
    },

    async updateQuestion(id: string, input: QuestionInput): Promise<void> {
      const rows = unwrap(
        await client.from("exam_questions").update(questionRow(input)).eq("id", id).select("id"),
      );
      if (rows.length === 0) throw new AppError("forbidden");
    },

    async removeQuestion(id: string): Promise<void> {
      const rows = unwrap(await client.from("exam_questions").delete().eq("id", id).select("id"));
      if (rows.length === 0) throw new AppError("forbidden");
    },

    /** Copies bank questions into the exam (a snapshot: later bank edits don't change it). */
    async importQuestions(
      schoolId: string,
      examId: string,
      startPosition: number,
      questions: BankQuestion[],
    ): Promise<void> {
      if (questions.length === 0) return;
      unwrap(
        await client.from("exam_questions").insert(
          questions.map((q, i) => ({
            school_id: schoolId,
            exam_id: examId,
            position: startPosition + i,
            ...questionRow(q),
          })),
        ),
      );
    },

    // ---------------------------------------------------------- question bank
    async listBank(subjectId?: string): Promise<BankQuestion[]> {
      let query = client
        .from("question_bank")
        .select("id, type, text, options, correct_answer, points, subject_id")
        .order("created_at", { ascending: false });
      if (subjectId) query = query.eq("subject_id", subjectId);
      const rows = unwrap(await query);
      return rows.map((row) => {
        const { position: _position, ...question } = toQuestion({ ...row, position: 0 });
        return { ...question, subjectId: row.subject_id };
      });
    },

    async addToBank(schoolId: string, subjectId: string, input: QuestionInput): Promise<void> {
      unwrap(
        await client
          .from("question_bank")
          .insert({ school_id: schoolId, subject_id: subjectId, ...questionRow(input) }),
      );
    },

    async updateBank(id: string, input: QuestionInput): Promise<void> {
      const rows = unwrap(
        await client.from("question_bank").update(questionRow(input)).eq("id", id).select("id"),
      );
      if (rows.length === 0) throw new AppError("forbidden");
    },

    async removeFromBank(id: string): Promise<void> {
      const rows = unwrap(await client.from("question_bank").delete().eq("id", id).select("id"));
      if (rows.length === 0) throw new AppError("forbidden");
    },

    // ------------------------------------------------------------- results
    /** Every student of the exam's class with their result and (online) attempt. */
    async listResults(exam: Exam): Promise<ExamResultEntry[]> {
      const [students, results, attempts] = await Promise.all([
        client
          .from("student_enrollments")
          .select("student:profiles!student_enrollments_student_id_school_id_fkey(id, full_name)")
          .eq("class_id", exam.classId)
          .then(unwrap),
        client.from("exam_results").select("student_id, score, note").eq("exam_id", exam.id).then(unwrap),
        exam.mode === "online"
          ? client
              .from("exam_attempts")
              .select("student_id, submitted_at, answers, auto_score")
              .eq("exam_id", exam.id)
              .then(unwrap)
          : Promise.resolve([]),
      ]);
      const resultByStudent = new Map(results.map((r) => [r.student_id, r]));
      const attemptByStudent = new Map(attempts.map((a) => [a.student_id, a]));
      return students
        .map(({ student }) => {
          const result = resultByStudent.get(student.id);
          const attempt = attemptByStudent.get(student.id);
          return {
            studentId: student.id,
            fullName: student.full_name,
            score: result ? Number(result.score) : null,
            note: result?.note ?? null,
            attempt: attempt
              ? {
                  submittedAt: attempt.submitted_at,
                  answers: toAnswers(attempt.answers),
                  autoScore: attempt.auto_score === null ? null : Number(attempt.auto_score),
                }
              : null,
          };
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));
    },

    /** Saves typed scores (null clears a result) in two statements. */
    async saveResults(
      schoolId: string,
      examId: string,
      rows: { studentId: string; score: number | null }[],
    ): Promise<void> {
      const scored = rows.filter((r): r is { studentId: string; score: number } => r.score !== null);
      const cleared = rows.filter((r) => r.score === null).map((r) => r.studentId);
      if (scored.length > 0) {
        unwrap(
          await client.from("exam_results").upsert(
            scored.map((r) => ({
              school_id: schoolId,
              exam_id: examId,
              student_id: r.studentId,
              score: r.score,
            })),
            { onConflict: "exam_id,student_id" },
          ),
        );
      }
      if (cleared.length > 0) {
        unwrap(
          await client
            .from("exam_results")
            .delete()
            .eq("exam_id", examId)
            .in("student_id", cleared),
        );
      }
    },

    // --------------------------------------------------------- exam room
    async start(examId: string): Promise<ExamPaper> {
      const paper = unwrap(await client.rpc("start_exam", { p_exam_id: examId })) as {
        exam: { id: string; title: string; instructions: string; max_score: number; ends_at: string };
        started_at: string;
        questions: { id: string; type: ExamQuestion["type"]; text: string; options: Json; points: number }[];
      };
      return {
        exam: {
          id: paper.exam.id,
          title: paper.exam.title,
          instructions: paper.exam.instructions,
          maxScore: Number(paper.exam.max_score),
          endsAt: paper.exam.ends_at,
        },
        startedAt: paper.started_at,
        questions: paper.questions.map((q) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          options: toOptions(q.options),
          points: Number(q.points),
        })),
      };
    },

    /** One write with every answer; returns the auto score. */
    async submit(examId: string, answers: ExamAnswers): Promise<number> {
      return Number(unwrap(await client.rpc("submit_exam", { p_exam_id: examId, p_answers: answers })));
    },

    // ------------------------------------------------------------ grades
    /** A student's published results (RLS hides unpublished ones), newest first. */
    async listStudentGrades(studentId: string): Promise<StudentGrade[]> {
      const rows = unwrap(
        await client
          .from("exam_results")
          .select(
            `score, exam:exams!exam_results_exam_fkey!inner(id, title, kind, max_score, starts_at, status,
              class_subject:class_subjects!exams_class_subject_fkey(subject:subjects(name)))`,
          )
          .eq("student_id", studentId)
          .eq("exam.status", "published"),
      );
      return rows
        .map((row) => ({
          examId: row.exam.id,
          title: row.exam.title,
          kind: row.exam.kind,
          subjectName: row.exam.class_subject.subject.name,
          score: Number(row.score),
          maxScore: Number(row.exam.max_score),
          startsAt: row.exam.starts_at,
        }))
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    },

    /** Grade book for one class subject: its exams and every student's result in each. */
    async gradebook(classSubjectId: string, classId: string) {
      const [exams, students] = await Promise.all([
        client
          .from("exams")
          .select(EXAM_COLUMNS)
          .eq("class_subject_id", classSubjectId)
          .in("status", ["approved", "published"])
          .order("starts_at")
          .then(unwrap),
        client
          .from("student_enrollments")
          .select("student:profiles!student_enrollments_student_id_school_id_fkey(id, full_name)")
          .eq("class_id", classId)
          .then(unwrap),
      ]);
      const examIds = exams.map((e) => e.id);
      const results =
        examIds.length === 0
          ? []
          : unwrap(
              await client
                .from("exam_results")
                .select("exam_id, student_id, score")
                .in("exam_id", examIds),
            );
      const scores = new Map(results.map((r) => [`${r.exam_id}:${r.student_id}`, Number(r.score)]));
      return {
        exams: exams.map(toExam),
        rows: students
          .map(({ student }) => ({
            studentId: student.id,
            fullName: student.full_name,
            scores: Object.fromEntries(examIds.map((id) => [id, scores.get(`${id}:${student.id}`) ?? null])),
          }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName, "ar")),
      };
    },
  };
}

export type ExamsService = ReturnType<typeof createExamsService>;
export type Gradebook = Awaited<ReturnType<ExamsService["gradebook"]>>;
