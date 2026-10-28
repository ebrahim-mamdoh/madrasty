"use client";

import { Activity } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { TeacherMonitoringRow } from "@madrasty/core";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useTeacherMonitoring } from "@/hooks/queries/dashboards/useDashboards";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { cn } from "@/lib/utils";

/** Admin → Monitoring: who keeps attendance, grading, results and reports up to date this month. */
export function MonitoringPageClient() {
  const t = useTranslations("monitoring");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const rows = useTeacherMonitoring();

  const count = (value: number, bad: boolean) => (
    <span className={cn("tabular-nums", bad && value > 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>
      {format.number(value)}
    </span>
  );

  const columns: EntityColumn<TeacherMonitoringRow>[] = [
    {
      key: "name",
      header: t("teacher"),
      cell: (row) => (
        <div>
          <p className="font-medium">{row.fullName}</p>
          <p className="text-xs text-muted-foreground">{t("classes_n", { count: row.classes })}</p>
        </div>
      ),
    },
    {
      key: "attendance",
      header: t("attendance_days"),
      cell: (row) => (
        <div>
          <span className="tabular-nums">{format.number(row.attendanceDays)}</span>
          <p className="text-xs text-muted-foreground">
            {row.lastAttendanceAt
              ? t("last_at", { time: format.relativeTime(new Date(row.lastAttendanceAt)) })
              : t("never")}
          </p>
        </div>
      ),
    },
    { key: "ungraded", header: t("ungraded"), cell: (row) => count(row.ungraded, true) },
    { key: "exams", header: t("exams_unpublished"), cell: (row) => count(row.examsUnpublished, true) },
    { key: "reports", header: t("reports_pending"), cell: (row) => count(row.reportsPending, true) },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {rows.isError ? (
        <EmptyState
          icon={Activity}
          title={toMessage(rows.error)}
          action={
            <Button variant="outline" onClick={() => void rows.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : !rows.isLoading && (rows.data ?? []).length === 0 ? (
        <EmptyState icon={Activity} title={t("empty")} />
      ) : (
        <EntityTable rows={rows.data ?? []} columns={columns} rowKey={(row) => row.teacherId} isLoading={rows.isLoading} />
      )}
    </>
  );
}
