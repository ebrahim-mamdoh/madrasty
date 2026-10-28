"use client";

import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { ExamTable } from "@/components/exams/ExamTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchoolExams } from "@/hooks/queries/exams/useExams";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useUrlState } from "@/hooks/useUrlState";

const TABS = ["pending", "all"] as const;

/** Admin → Exams: the approval queue first, then every exam of the year. */
export function AdminExamsPageClient() {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const { searchParams, setParams } = useUrlState();
  const tab = searchParams.get("tab") === "all" ? "all" : "pending";
  const exams = useSchoolExams(tab === "pending" ? "pending" : undefined);
  const rows = exams.data ?? [];

  return (
    <>
      <PageHeader title={t("title")} description={t("admin_subtitle")} />
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
        <TabsList className="mb-4">
          {TABS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`admin_tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
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
        <EmptyState icon={ClipboardList} title={tab === "pending" ? t("no_pending") : t("admin_empty")} />
      ) : (
        <ExamTable rows={rows} isLoading={exams.isLoading} basePath="/admin/exams" />
      )}
    </>
  );
}
