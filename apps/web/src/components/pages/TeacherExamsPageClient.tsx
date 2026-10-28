"use client";

import { ClipboardList, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ExamFormDialog } from "@/components/exams/ExamFormDialog";
import { ExamTable } from "@/components/exams/ExamTable";
import { QuestionBankPanel } from "@/components/exams/QuestionBankPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeacherExams } from "@/hooks/queries/exams/useExams";
import { useMyAssignments } from "@/hooks/queries/homework/useHomework";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useUrlState } from "@/hooks/useUrlState";
import { useRouter } from "@/i18n/navigation";

const BASE_PATH = "/teacher/exams";

export function TeacherExamsPageClient() {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const router = useRouter();
  const { searchParams, setParams } = useUrlState();
  const tab = searchParams.get("tab") === "bank" ? "bank" : "exams";

  const exams = useTeacherExams();
  const assignments = useMyAssignments();
  const [creating, setCreating] = useState(false);

  // The bank is per subject: one entry per subject the teacher teaches (in any class).
  const bankSubjects = [
    ...new Map(
      (assignments.data ?? []).map((a) => [a.subjectId, { id: a.subjectId, name: a.subjectName }]),
    ).values(),
  ];
  const rows = exams.data ?? [];

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("teacher_subtitle")}
        actions={
          <Button onClick={() => setCreating(true)} disabled={(assignments.data ?? []).length === 0}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
        <TabsList className="mb-4">
          <TabsTrigger value="exams">{t("tabs.exams")}</TabsTrigger>
          <TabsTrigger value="bank">{t("tabs.bank")}</TabsTrigger>
        </TabsList>
        <TabsContent value="exams">
          {exams.isError ? (
            <EmptyState
              icon={ClipboardList}
              title={toMessage(exams.error)}
              action={
                <Button variant="outline" onClick={() => void exams.refetch()}>
                  {tc("retry")}
                </Button>
              }
            />
          ) : !exams.isLoading && rows.length === 0 ? (
            <EmptyState icon={ClipboardList} title={t("teacher_empty")} description={t("teacher_empty_hint")} />
          ) : (
            <ExamTable rows={rows} isLoading={exams.isLoading} basePath={BASE_PATH} />
          )}
        </TabsContent>
        <TabsContent value="bank">
          {tab === "bank" && <QuestionBankPanel subjects={bankSubjects} />}
        </TabsContent>
      </Tabs>

      <ExamFormDialog
        key={creating ? "open" : "closed"}
        open={creating}
        onOpenChange={setCreating}
        exam={null}
        onCreated={(id) => router.push(`${BASE_PATH}/${id}`)}
      />
    </>
  );
}
