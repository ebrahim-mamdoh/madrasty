"use client";

import { CalendarCheck, CalendarX, Clock, Percent, ShieldCheck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ATTENDANCE_STATUSES, attendanceRate, type AttendanceRecord } from "@madrasty/core";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { useMyAttendance } from "@/hooks/queries/attendance/useAttendance";
import { useAcademicYears } from "@/hooks/queries/structure/useStructure";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { localDate } from "@/lib/dates";

/** Student → their attendance this academic year: rate, counts and day-by-day history. */
export function StudentAttendancePageClient() {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();

  const years = useAcademicYears();
  const year = years.data?.find((y) => y.isCurrent);
  const records = useMyAttendance(year ? { from: year.startsOn, to: year.endsOn } : undefined);

  const counts = Object.fromEntries(
    ATTENDANCE_STATUSES.map((status) => [
      status,
      (records.data ?? []).filter((r) => r.status === status).length,
    ]),
  ) as Record<(typeof ATTENDANCE_STATUSES)[number], number>;
  const rate = attendanceRate(counts);

  const columns: EntityColumn<AttendanceRecord>[] = [
    {
      key: "date",
      header: t("date"),
      cell: (record) => format.dateTime(localDate(record.date), { dateStyle: "full" }),
    },
    {
      key: "status",
      header: t("status_label"),
      cell: (record) => (
        <AttendanceStatusBadge status={record.status} label={t(`status.${record.status}`)} />
      ),
    },
    {
      key: "note",
      header: t("note"),
      cell: (record) => <span className="text-muted-foreground">{record.note ?? "—"}</span>,
    },
  ];

  const error = years.error ?? records.error;
  const isLoading = years.isLoading || records.isLoading;

  return (
    <>
      <PageHeader title={t("title")} description={t("student_subtitle")} />
      {error ? (
        <EmptyState
          icon={CalendarCheck}
          title={toMessage(error)}
          action={
            <Button variant="outline" onClick={() => void records.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : !isLoading && !year ? (
        <EmptyState icon={CalendarCheck} title={t("no_year")} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("rate")}
              value={rate === null ? "—" : format.number(rate / 100, { style: "percent" })}
              icon={Percent}
              isLoading={isLoading}
            />
            <StatCard
              label={t("status.present")}
              value={format.number(counts.present)}
              icon={CalendarCheck}
              isLoading={isLoading}
            />
            <StatCard
              label={t("status.absent")}
              value={format.number(counts.absent)}
              icon={CalendarX}
              isLoading={isLoading}
            />
            <StatCard
              label={`${t("status.late")} / ${t("status.excused")}`}
              value={`${format.number(counts.late)} / ${format.number(counts.excused)}`}
              icon={counts.late > 0 ? Clock : ShieldCheck}
              isLoading={isLoading}
            />
          </div>
          {!isLoading && (records.data ?? []).length === 0 ? (
            <EmptyState icon={CalendarCheck} title={t("student_empty")} />
          ) : (
            <EntityTable
              rows={records.data ?? []}
              columns={columns}
              rowKey={(record) => record.id}
              isLoading={isLoading}
            />
          )}
        </div>
      )}
    </>
  );
}
