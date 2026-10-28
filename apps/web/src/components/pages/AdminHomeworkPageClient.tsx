"use client";

import { Layers, NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";
import { ClassPicker } from "@/components/attendance/ClassPicker";
import { HomeworkTable } from "@/components/homework/HomeworkTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClassHomework } from "@/hooks/queries/homework/useHomework";
import { useAcademicYears, useClasses } from "@/hooks/queries/structure/useStructure";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useUrlState } from "@/hooks/useUrlState";

/** Admin → Homework: follow each class's homework and how many students handed it in. */
export function AdminHomeworkPageClient() {
  const t = useTranslations("homework");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const { searchParams, setParams } = useUrlState();

  const years = useAcademicYears();
  const currentYearId = years.data?.find((year) => year.isCurrent)?.id;
  const classes = useClasses(currentYearId);
  const classList = classes.data ?? [];
  const requested = searchParams.get("class");
  const classId = classList.some((c) => c.id === requested) ? requested! : classList[0]?.id;
  const homework = useClassHomework(classId);

  const isLoading = years.isLoading || classes.isLoading;
  const rows = homework.data ?? [];

  let body;
  if (!isLoading && classList.length === 0) {
    body = <EmptyState icon={Layers} title={t("no_classes")} />;
  } else if (homework.isError) {
    body = (
      <EmptyState
        icon={NotebookPen}
        title={toMessage(homework.error)}
        action={
          <Button variant="outline" onClick={() => void homework.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  } else if (!isLoading && !homework.isLoading && rows.length === 0) {
    body = <EmptyState icon={NotebookPen} title={t("class_empty")} />;
  } else {
    body = (
      <HomeworkTable
        rows={rows}
        isLoading={isLoading || homework.isLoading}
        basePath="/admin/homework"
      />
    );
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("admin_subtitle")} />
      <div className="mb-4">
        {isLoading ? (
          <Skeleton className="h-9 w-60" />
        ) : (
          classList.length > 0 && (
            <ClassPicker
              classes={classList.map((c) => ({ id: c.id, name: c.name, detail: c.gradeLevel.name }))}
              value={classId}
              onChange={(value) => setParams({ class: value })}
              label={t("class")}
            />
          )
        )}
      </div>
      {body}
    </>
  );
}
