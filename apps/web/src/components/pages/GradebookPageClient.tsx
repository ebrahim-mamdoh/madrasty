"use client";

import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { ClassPicker } from "@/components/attendance/ClassPicker";
import { GradebookTable } from "@/components/exams/GradebookTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAssignments } from "@/hooks/queries/homework/useHomework";
import {
  useAcademicYears,
  useClassSubjects,
  useClasses,
} from "@/hooks/queries/structure/useStructure";
import { useUrlState } from "@/hooks/useUrlState";

/** Admin → any class subject of the year; teacher → their own class subjects. */
export function GradebookPageClient({ viewer }: { viewer: "admin" | "teacher" }) {
  return viewer === "admin" ? <AdminGradebook /> : <TeacherGradebook />;
}

function AdminGradebook() {
  const t = useTranslations("exams");
  const { searchParams, setParams } = useUrlState();
  const years = useAcademicYears();
  const currentYearId = years.data?.find((y) => y.isCurrent)?.id;
  const classes = useClasses(currentYearId);
  const classList = classes.data ?? [];
  const requestedClass = searchParams.get("class");
  const classId = classList.some((c) => c.id === requestedClass) ? requestedClass! : classList[0]?.id;
  const subjects = useClassSubjects(classId);
  const subjectList = subjects.data ?? [];
  const requestedSubject = searchParams.get("subject");
  const classSubjectId = subjectList.some((s) => s.id === requestedSubject)
    ? requestedSubject!
    : subjectList[0]?.id;

  const isLoading = years.isLoading || classes.isLoading;

  return (
    <>
      <PageHeader title={t("gradebook")} description={t("gradebook_subtitle")} />
      {!isLoading && classList.length === 0 ? (
        <EmptyState icon={Layers} title={t("no_classes")} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-60" />
            ) : (
              <ClassPicker
                classes={classList.map((c) => ({ id: c.id, name: c.name, detail: c.gradeLevel.name }))}
                value={classId}
                onChange={(value) => setParams({ class: value, subject: null })}
                label={t("class")}
              />
            )}
            {subjectList.length > 0 && (
              <ClassPicker
                classes={subjectList.map((s) => ({ id: s.id, name: s.subject.name }))}
                value={classSubjectId}
                onChange={(value) => setParams({ subject: value })}
                label={t("subject")}
              />
            )}
          </div>
          <GradebookTable classSubjectId={classSubjectId} classId={classId} examPath="/admin/exams" />
        </div>
      )}
    </>
  );
}

function TeacherGradebook() {
  const t = useTranslations("exams");
  const { searchParams, setParams } = useUrlState();
  const assignments = useMyAssignments();
  const list = assignments.data ?? [];
  const requested = searchParams.get("subject");
  const current = list.find((a) => a.classSubjectId === requested) ?? list[0];

  return (
    <>
      <PageHeader title={t("gradebook")} description={t("gradebook_teacher_subtitle")} />
      {!assignments.isLoading && list.length === 0 ? (
        <EmptyState icon={Layers} title={t("no_assignments")} />
      ) : (
        <div className="space-y-4">
          {assignments.isLoading ? (
            <Skeleton className="h-9 w-60" />
          ) : (
            <ClassPicker
              classes={list.map((a) => ({ id: a.classSubjectId, name: a.className, detail: a.subjectName }))}
              value={current?.classSubjectId}
              onChange={(value) => setParams({ subject: value })}
              label={t("class")}
            />
          )}
          <GradebookTable
            classSubjectId={current?.classSubjectId}
            classId={current?.classId}
            examPath="/teacher/exams"
          />
        </div>
      )}
    </>
  );
}
