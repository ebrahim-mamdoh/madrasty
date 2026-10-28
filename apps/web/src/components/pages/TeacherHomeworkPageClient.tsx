"use client";

import { NotebookPen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { HomeworkFormDialog } from "@/components/homework/HomeworkFormDialog";
import { HomeworkTable } from "@/components/homework/HomeworkTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useMyAssignments, useTeacherHomework } from "@/hooks/queries/homework/useHomework";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useRouter } from "@/i18n/navigation";

const BASE_PATH = "/teacher/homework";

export function TeacherHomeworkPageClient() {
  const t = useTranslations("homework");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const router = useRouter();
  const homework = useTeacherHomework();
  const assignments = useMyAssignments();
  const [creating, setCreating] = useState(false);

  const canCreate = (assignments.data ?? []).length > 0;
  const rows = homework.data ?? [];

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("teacher_subtitle")}
        actions={
          <Button onClick={() => setCreating(true)} disabled={!canCreate}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        }
      />

      {homework.isError ? (
        <EmptyState
          icon={NotebookPen}
          title={toMessage(homework.error)}
          action={
            <Button variant="outline" onClick={() => void homework.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : !homework.isLoading && rows.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={t("teacher_empty")}
          description={canCreate || assignments.isLoading ? t("teacher_empty_hint") : t("no_assignments")}
        />
      ) : (
        <HomeworkTable rows={rows} isLoading={homework.isLoading} basePath={BASE_PATH} />
      )}

      <HomeworkFormDialog
        key={creating ? "open" : "closed"}
        open={creating}
        onOpenChange={setCreating}
        homework={null}
        onCreated={(id) => router.push(`${BASE_PATH}/${id}`)}
      />
    </>
  );
}
