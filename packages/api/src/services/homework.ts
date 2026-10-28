import {
  AppError,
  type Homework,
  type HomeworkAttachment,
  type HomeworkInput,
  type HomeworkSubmission,
  type HomeworkWithStats,
  type GradeInput,
  type StudentHomework,
  type SubmissionRosterEntry,
  type TeachingAssignment,
} from "@madrasty/core";
import type { Json } from "../database.types";
import type { TypedSupabaseClient } from "../client";
import { toAppError, unwrap } from "../errors";

const BUCKET = "homework";

const HOMEWORK_COLUMNS = `id, title, body, due_at, max_score, attachments, class_id, class_subject_id, created_at,
  class:classes!homework_class_fkey(name),
  class_subject:class_subjects!homework_class_subject_fkey(subject:subjects(name))`;

const SUBMISSION_COLUMNS =
  "id, homework_id, student_id, body, attachments, submitted_at, score, feedback, graded_at";

/** A file chosen in the browser, before upload. */
export type NewAttachment = { file: Blob; name: string };

/** Homework input with `dueAt` as an ISO timestamp (the form's local time, converted by the UI). */
export type HomeworkWrite = Omit<HomeworkInput, "dueAt"> & { dueAt: string };

function toAttachments(value: Json): HomeworkAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { path, name, size, type } = item as Record<string, unknown>;
    return typeof path === "string" && typeof name === "string"
      ? [{ path, name, size: Number(size) || 0, type: typeof type === "string" ? type : "" }]
      : [];
  });
}

type HomeworkRow = {
  id: string;
  title: string;
  body: string;
  due_at: string;
  max_score: number | null;
  attachments: Json;
  class_id: string;
  class_subject_id: string;
  created_at: string;
  class: { name: string };
  class_subject: { subject: { name: string } };
};

function toHomework(row: HomeworkRow): Homework {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    dueAt: row.due_at,
    maxScore: row.max_score === null ? null : Number(row.max_score),
    attachments: toAttachments(row.attachments),
    classId: row.class_id,
    className: row.class.name,
    classSubjectId: row.class_subject_id,
    subjectName: row.class_subject.subject.name,
    createdAt: row.created_at,
  };
}

type SubmissionRow = {
  id: string;
  student_id: string;
  body: string;
  attachments: Json;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
};

function toSubmission(row: SubmissionRow): HomeworkSubmission {
  return {
    id: row.id,
    studentId: row.student_id,
    body: row.body,
    attachments: toAttachments(row.attachments),
    submittedAt: row.submitted_at,
    score: row.score === null ? null : Number(row.score),
    feedback: row.feedback,
    gradedAt: row.graded_at,
  };
}

/** Keeps the extension, drops everything else from the user's file name. */
function storageName(name: string): string {
  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return extension ? `${crypto.randomUUID()}.${extension}` : crypto.randomUUID();
}

/**
 * Homework and submissions. RLS (+ the `homework` feature) decides who reads and writes;
 * a DB guard keeps students away from grades and graders away from answers. Files live in the
 * private `homework` bucket and are served through short-lived signed URLs.
 */
export function createHomeworkService(client: TypedSupabaseClient) {
  const bucket = () => client.storage.from(BUCKET);

  async function upload(prefix: string, files: NewAttachment[]): Promise<HomeworkAttachment[]> {
    const uploaded: HomeworkAttachment[] = [];
    try {
      for (const { file, name } of files) {
        const path = `${prefix}/${storageName(name)}`;
        const { error } = await bucket().upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw toAppError(error);
        uploaded.push({ path, name, size: file.size, type: file.type });
      }
      return uploaded;
    } catch (error) {
      if (uploaded.length > 0) await bucket().remove(uploaded.map((a) => a.path));
      throw error;
    }
  }

  async function removeFiles(paths: string[]) {
    if (paths.length > 0) await bucket().remove(paths);
  }

  async function withStats(homework: Homework[]): Promise<HomeworkWithStats[]> {
    if (homework.length === 0) return [];
    const stats = unwrap(await client.rpc("homework_overview", {}));
    const byId = new Map(stats.map((s) => [s.homework_id, s]));
    return homework.map((h) => ({
      ...h,
      students: byId.get(h.id)?.students ?? 0,
      submitted: byId.get(h.id)?.submitted ?? 0,
      graded: byId.get(h.id)?.graded ?? 0,
    }));
  }

  async function currentYearId(): Promise<string | null> {
    const year = unwrap(
      await client.from("academic_years").select("id").eq("is_current", true).maybeSingle(),
    );
    return year?.id ?? null;
  }

  return {
    /** The class subjects the teacher teaches this year (the "for whom" of a new homework). */
    async listMyAssignments(teacherId: string): Promise<TeachingAssignment[]> {
      const yearId = await currentYearId();
      if (!yearId) return [];
      const rows = unwrap(
        await client
          .from("class_subjects")
          .select("id, class:classes!inner(id, name, academic_year_id), subject:subjects(id, name)")
          .eq("teacher_id", teacherId)
          .eq("class.academic_year_id", yearId),
      );
      return rows
        .map((row) => ({
          classSubjectId: row.id,
          classId: row.class.id,
          className: row.class.name,
          subjectId: row.subject.id,
          subjectName: row.subject.name,
        }))
        .sort(
          (a, b) =>
            a.className.localeCompare(b.className, "ar") ||
            a.subjectName.localeCompare(b.subjectName, "ar"),
        );
    },

    /** Homework of the teacher's subjects (current year), newest due date first. */
    async listForTeacher(teacherId: string): Promise<HomeworkWithStats[]> {
      const yearId = await currentYearId();
      if (!yearId) return [];
      const rows = unwrap(
        await client
          .from("homework")
          .select(
            `${HOMEWORK_COLUMNS}, scope:class_subjects!homework_class_subject_fkey!inner(teacher_id), year:classes!homework_class_fkey!inner(academic_year_id)`,
          )
          .eq("scope.teacher_id", teacherId)
          .eq("year.academic_year_id", yearId)
          .order("due_at", { ascending: false }),
      );
      return withStats(rows.map(toHomework));
    },

    /** Every homework of one class (admin follow-up), newest due date first. */
    async listForClass(classId: string): Promise<HomeworkWithStats[]> {
      const rows = unwrap(
        await client
          .from("homework")
          .select(HOMEWORK_COLUMNS)
          .eq("class_id", classId)
          .order("due_at", { ascending: false }),
      );
      return withStats(rows.map(toHomework));
    },

    /** The student's class homework with their own submissions. */
    async listForStudent(studentId: string, classId: string): Promise<StudentHomework[]> {
      const [rows, submissions] = await Promise.all([
        client
          .from("homework")
          .select(HOMEWORK_COLUMNS)
          .eq("class_id", classId)
          .order("due_at", { ascending: false })
          .then(unwrap),
        client
          .from("homework_submissions")
          .select(SUBMISSION_COLUMNS)
          .eq("student_id", studentId)
          .then(unwrap),
      ]);
      const byHomework = new Map(submissions.map((s) => [s.homework_id, toSubmission(s)]));
      return rows.map((row) => ({ ...toHomework(row), submission: byHomework.get(row.id) ?? null }));
    },

    async get(id: string): Promise<Homework> {
      const row = unwrap(
        await client.from("homework").select(HOMEWORK_COLUMNS).eq("id", id).maybeSingle(),
      );
      if (!row) throw new AppError("not_found");
      return toHomework(row);
    },

    /** Uploads the files, then creates the homework; nothing is left behind if either fails. */
    async create(
      schoolId: string,
      classId: string,
      input: HomeworkWrite,
      files: NewAttachment[],
    ): Promise<string> {
      const id = crypto.randomUUID();
      const attachments = await upload(`${schoolId}/homework/${id}`, files);
      try {
        unwrap(
          await client.from("homework").insert({
            id,
            school_id: schoolId,
            class_id: classId,
            class_subject_id: input.classSubjectId,
            title: input.title,
            body: input.body,
            due_at: input.dueAt,
            max_score: input.maxScore,
            attachments,
          }),
        );
      } catch (error) {
        await removeFiles(attachments.map((a) => a.path));
        throw error;
      }
      return id;
    },

    /** Edits the text and dates; `kept` are the existing files to keep, `files` new ones to add. */
    async update(
      schoolId: string,
      homework: Homework,
      input: Omit<HomeworkWrite, "classSubjectId">,
      kept: HomeworkAttachment[],
      files: NewAttachment[],
    ): Promise<void> {
      const added = await upload(`${schoolId}/homework/${homework.id}`, files);
      try {
        const rows = unwrap(
          await client
            .from("homework")
            .update({
              title: input.title,
              body: input.body,
              due_at: input.dueAt,
              max_score: input.maxScore,
              attachments: [...kept, ...added],
            })
            .eq("id", homework.id)
            .select("id"),
        );
        if (rows.length === 0) throw new AppError("not_found");
      } catch (error) {
        await removeFiles(added.map((a) => a.path));
        throw error;
      }
      const keptPaths = new Set(kept.map((a) => a.path));
      await removeFiles(homework.attachments.filter((a) => !keptPaths.has(a.path)).map((a) => a.path));
    },

    /** Refused with errors.in_use once students have submitted. */
    async remove(homework: Homework): Promise<void> {
      const rows = unwrap(await client.from("homework").delete().eq("id", homework.id).select("id"));
      if (rows.length === 0) throw new AppError("not_found");
      await removeFiles(homework.attachments.map((a) => a.path));
    },

    /** Every student of the class with their submission (grading view). */
    async listSubmissions(homework: Homework): Promise<SubmissionRosterEntry[]> {
      const [students, submissions] = await Promise.all([
        client
          .from("student_enrollments")
          .select("student:profiles!student_enrollments_student_id_school_id_fkey(id, full_name)")
          .eq("class_id", homework.classId)
          .then(unwrap),
        client
          .from("homework_submissions")
          .select(SUBMISSION_COLUMNS)
          .eq("homework_id", homework.id)
          .then(unwrap),
      ]);
      const byStudent = new Map(submissions.map((s) => [s.student_id, toSubmission(s)]));
      return students
        .map(({ student }) => ({
          studentId: student.id,
          fullName: student.full_name,
          submission: byStudent.get(student.id) ?? null,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));
    },

    /** Creates or replaces the student's answer (until it is graded). */
    async submit(
      schoolId: string,
      homeworkId: string,
      studentId: string,
      body: string,
      kept: HomeworkAttachment[],
      files: NewAttachment[],
      previous: HomeworkSubmission | null,
    ): Promise<void> {
      const added = await upload(`${schoolId}/submissions/${homeworkId}/${studentId}`, files);
      try {
        unwrap(
          await client.from("homework_submissions").upsert(
            {
              school_id: schoolId,
              homework_id: homeworkId,
              student_id: studentId,
              body,
              attachments: [...kept, ...added],
            },
            { onConflict: "homework_id,student_id" },
          ),
        );
      } catch (error) {
        await removeFiles(added.map((a) => a.path));
        throw error;
      }
      const keptPaths = new Set(kept.map((a) => a.path));
      await removeFiles(
        (previous?.attachments ?? []).filter((a) => !keptPaths.has(a.path)).map((a) => a.path),
      );
    },

    async grade(submissionId: string, input: GradeInput): Promise<void> {
      const rows = unwrap(
        await client
          .from("homework_submissions")
          .update({ score: input.score, feedback: input.feedback || null })
          .eq("id", submissionId)
          .select("id"),
      );
      if (rows.length === 0) throw new AppError("not_found");
    },

    /** A short-lived download link (the bucket is private) that saves under the original name. */
    async fileUrl(attachment: HomeworkAttachment): Promise<string> {
      const { data, error } = await bucket().createSignedUrl(attachment.path, 60, {
        download: attachment.name,
      });
      if (error || !data) throw toAppError(error);
      return data.signedUrl;
    },
  };
}

export type HomeworkService = ReturnType<typeof createHomeworkService>;
