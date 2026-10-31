"use client";

import { BarChart3 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { attendanceRate, type AttendanceSummaryRow } from "@madrasty/core";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAttendanceSummary } from "@/hooks/queries/attendance/useAttendance";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { monthRange } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type AttendanceReportPanelProps = {
  classId: string | undefined;
  /** `YYYY-MM` */
  month: string;
  onMonthChange: (month: string) => void;
};

/** Monthly per-student counts and attendance rate for one class. */
export function AttendanceReportPanel({ classId, month, onMonthChange }: AttendanceReportPanelProps) {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const { from, to } = monthRange(month);
  const summary = useAttendanceSummary(classId, from, to);

  const count = (value: number) => <span className="tabular-nums">{format.number(value)}</span>;
  const columns: EntityColumn<AttendanceSummaryRow>[] = [
    {
      key: "name",
      header: t("student"),
      cell: (row) => <span className="font-medium">{row.fullName}</span>,
    },
    {
      key: "present",
      header: t("status.present"),
      cell: (row) => count(row.present),
      className: "text-center tabular-nums",
    },
    {
      key: "absent",
      header: t("status.absent"),
      cell: (row) => count(row.absent),
      className: "text-center tabular-nums",
    },
    {
      key: "late",
      header: t("status.late"),
      cell: (row) => count(row.late),
      className: "text-center tabular-nums",
    },
    {
      key: "excused",
      header: t("status.excused"),
      cell: (row) => count(row.excused),
      className: "text-center tabular-nums",
    },
    {
      key: "rate",
      header: t("rate"),
      className: "text-center tabular-nums",
      cell: (row) => {
        const rate = attendanceRate(row);
        return rate === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span
            className={cn(
              "font-semibold tabular-nums",
              rate >= 90 ? "text-success" : rate >= 75 ? "text-warning" : "text-destructive",
            )}
          >
            {format.number(rate / 100, { style: "percent" })}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Input
        type="month"
        value={month}
        onChange={(event) => event.target.value && onMonthChange(event.target.value)}
        aria-label={t("month")}
        className="w-48"
        dir="ltr"
      />
      {summary.isError ? (
        <EmptyState
          icon={BarChart3}
          title={toMessage(summary.error)}
          action={
            <Button variant="outline" onClick={() => void summary.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : !summary.isLoading && (summary.data ?? []).length === 0 ? (
        <EmptyState icon={BarChart3} title={t("no_students")} />
      ) : (
        <EntityTable
          rows={summary.data ?? []}
          columns={columns}
          rowKey={(row) => row.studentId}
          isLoading={summary.isLoading}
        />
      )}
    </div>
  );
}
