"use client";

import { Eye, FileText, Loader2, Pencil, Send } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { attendanceRate, type ReportRosterEntry } from "@madrasty/core";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { IconAction } from "@/components/shared/IconAction";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttendanceSummary } from "@/hooks/queries/attendance/useAttendance";
import { useReportSheet, useSendReports } from "@/hooks/queries/reports/useReports";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { monthRange } from "@/lib/dates";
import { notifyError, notifySuccess } from "@/lib/utils";

export type ReportsSheetProps = {
  classId: string;
  /** `YYYY-MM` */
  month: string;
  canWrite: boolean;
};

/** A class's reports for one month: who has a draft or a sent report, and sending in one click. */
export function ReportsSheet({ classId, month, canWrite }: ReportsSheetProps) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const stored = `${month}-01`;
  const sheet = useReportSheet(classId, stored);
  const { from, to } = monthRange(month);
  const attendance = useAttendanceSummary(classId, from, to);
  const send = useSendReports();
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<ReportRosterEntry | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (sheet.isError) return <EmptyState icon={FileText} title={toMessage(sheet.error)} />;
  if (sheet.isLoading || !sheet.data) return <Skeleton className="h-48" />;
  const rows = sheet.data;
  if (rows.length === 0) return <EmptyState icon={FileText} title={t("no_students")} />;

  const rateByStudent = new Map((attendance.data ?? []).map((row) => [row.studentId, attendanceRate(row)]));
  const drafts = rows.filter((r) => r.report?.status === "draft");
  const sentCount = rows.filter((r) => r.report?.status === "sent").length;
  const toSend = selected.length > 0 ? selected : drafts.map((r) => r.report!.id);

  const onSend = () =>
    send.mutate(toSend, {
      onSuccess: (count) => {
        notifySuccess(t("sent_n", { n: count }));
        setSelected([]);
      },
      onError: (error) => notifyError(toMessage(error)),
      onSettled: () => setConfirming(false),
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("progress", { drafts: drafts.length, sent: sentCount, total: rows.length })}
        </p>
        {canWrite && (
          <Button disabled={send.isPending || toSend.length === 0} onClick={() => setConfirming(true)}>
            {send.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
            {selected.length > 0 ? t("send_selected", { n: selected.length }) : t("send_all", { n: drafts.length })}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              {canWrite && <th className="w-10 p-3" />}
              <th className="p-3 text-start font-medium">{t("student")}</th>
              <th className="p-3 text-start font-medium">{t("attendance_rate")}</th>
              <th className="p-3 text-start font-medium">{t("status_label")}</th>
              <th className="w-12 p-3">
                <span className="sr-only">{tc("actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rate = rateByStudent.get(row.studentId) ?? null;
              const isDraft = row.report?.status === "draft";
              const editable = canWrite && row.report?.status !== "sent";
              return (
                <tr key={row.studentId} className="border-t">
                  {canWrite && (
                    <td className="p-3">
                      {isDraft && (
                        <Checkbox
                          aria-label={t("select", { name: row.fullName })}
                          checked={selected.includes(row.report!.id)}
                          onCheckedChange={(checked) =>
                            setSelected((current) =>
                              checked === true
                                ? [...current, row.report!.id]
                                : current.filter((id) => id !== row.report!.id),
                            )
                          }
                        />
                      )}
                    </td>
                  )}
                  <td className="p-3 font-medium">{row.fullName}</td>
                  <td className="p-3 tabular-nums text-muted-foreground">
                    {rate === null ? "—" : format.number(rate / 100, { style: "percent" })}
                  </td>
                  <td className="p-3">
                    {row.report?.status === "sent" ? (
                      <StatusBadge tone="success" label={t("status.sent")} />
                    ) : isDraft ? (
                      <StatusBadge tone="warning" label={t("status.draft")} />
                    ) : (
                      <StatusBadge tone="muted" label={t("status.none")} />
                    )}
                  </td>
                  <td className="p-2">
                    {editable ? (
                      <IconAction icon={Pencil} label={t("write")} onClick={() => setOpen(row)} />
                    ) : row.report ? (
                      <IconAction icon={Eye} label={t("view")} onClick={() => setOpen(row)} />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ReportDialog
        key={open ? `${open.studentId}:${open.report?.id ?? "new"}` : "none"}
        classId={classId}
        month={stored}
        entry={open}
        readOnly={!canWrite || open?.report?.status === "sent"}
        onOpenChange={(next) => !next && setOpen(null)}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("send_title")}
        description={t("send_description", { n: toSend.length })}
        confirmLabel={t("send")}
        destructive={false}
        isPending={send.isPending}
        onConfirm={onSend}
      />
    </div>
  );
}
