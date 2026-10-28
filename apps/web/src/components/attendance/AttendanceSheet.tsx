"use client";

import { CheckCheck, ClipboardCheck, Loader2, Save, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import {
  ATTENDANCE_STATUSES,
  type AttendanceDay,
  type AttendanceStatus,
} from "@madrasty/core";
import { AttendanceStatusBadge, STATUS_TONES } from "@/components/attendance/AttendanceStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttendanceDay, useSaveAttendance } from "@/hooks/queries/attendance/useAttendance";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { cn, notifyError, notifySuccess } from "@/lib/utils";

export type AttendanceSheetProps = {
  classId: string;
  date: string;
  canEdit: boolean;
};

/** One class, one day. Loads the saved sheet and (when editable) lets it be filled and saved. */
export function AttendanceSheet({ classId, date, canEdit }: AttendanceSheetProps) {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const day = useAttendanceDay(classId, date);

  if (day.isError) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={toMessage(day.error)}
        action={
          <Button variant="outline" onClick={() => void day.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  }
  if (day.isLoading || !day.data) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (day.data.entries.length === 0) {
    return <EmptyState icon={Users} title={t("no_students")} />;
  }
  // Re-seeded whenever the saved sheet changes (another date/class, or after saving).
  return (
    <SheetEditor
      key={`${classId}:${date}:${day.data.lastRecordedAt ?? "new"}`}
      classId={classId}
      date={date}
      day={day.data}
      canEdit={canEdit}
    />
  );
}

type Draft = Record<string, { status: AttendanceStatus; note: string }>;

function SheetEditor({
  classId,
  date,
  day,
  canEdit,
}: AttendanceSheetProps & { day: AttendanceDay }) {
  const t = useTranslations("attendance");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const save = useSaveAttendance();
  const isRecorded = day.lastRecordedAt !== null;

  // Unrecorded students start as present: the teacher only touches the exceptions.
  const [draft, setDraft] = useState<Draft>(() =>
    Object.fromEntries(
      day.entries.map((entry) => [
        entry.studentId,
        { status: entry.status ?? "present", note: entry.note },
      ]),
    ),
  );

  const counts = ATTENDANCE_STATUSES.map((status) => ({
    status,
    count: Object.values(draft).filter((d) => d.status === status).length,
  }));

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setDraft((current) => ({ ...current, [studentId]: { ...current[studentId]!, status } }));
  const setNote = (studentId: string, note: string) =>
    setDraft((current) => ({ ...current, [studentId]: { ...current[studentId]!, note } }));

  const onSave = () =>
    save.mutate(
      {
        classId,
        date,
        entries: day.entries.map((entry) => ({
          studentId: entry.studentId,
          status: draft[entry.studentId]!.status,
          note: draft[entry.studentId]!.note.trim(),
        })),
      },
      {
        onSuccess: () =>
          notifySuccess(
            Object.values(draft).some((d) => d.status === "absent") ? t("saved_notified") : t("saved"),
          ),
        onError: (error) => notifyError(toMessage(error)),
      },
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {counts.map(({ status, count }) => (
            <AttendanceStatusBadge
              key={status}
              status={status}
              label={`${t(`status.${status}`)}: ${format.number(count)}`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {isRecorded
            ? t("last_saved", {
                time: format.dateTime(new Date(day.lastRecordedAt!), {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })
            : t("not_recorded")}
        </p>
      </div>

      <ul className="divide-y rounded-xl border bg-card">
        {day.entries.map((entry, index) => {
          const value = draft[entry.studentId]!;
          return (
            <li
              key={entry.studentId}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            >
              <span className="w-6 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
              <span className="min-w-40 flex-1 font-medium">{entry.fullName}</span>

              {canEdit ? (
                <div
                  role="radiogroup"
                  aria-label={t("status_for", { name: entry.fullName })}
                  className="flex flex-wrap gap-1"
                >
                  {ATTENDANCE_STATUSES.map((status) => {
                    const checked = value.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => setStatus(entry.studentId, status)}
                        className={cn(
                          "rounded-md border px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          checked ? STATUS_TONES[status] : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {t(`status.${status}`)}
                      </button>
                    );
                  })}
                </div>
              ) : entry.status ? (
                <AttendanceStatusBadge status={entry.status} label={t(`status.${entry.status}`)} />
              ) : (
                <span className="text-sm text-muted-foreground">{t("not_recorded_short")}</span>
              )}

              {canEdit ? (
                value.status !== "present" && (
                  <Input
                    value={value.note}
                    onChange={(event) => setNote(entry.studentId, event.target.value)}
                    placeholder={t("note_placeholder")}
                    aria-label={t("note_for", { name: entry.fullName })}
                    maxLength={200}
                    className="h-8 w-full sm:w-56"
                  />
                )
              ) : (
                entry.note && <span className="text-sm text-muted-foreground">{entry.note}</span>
              )}
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={save.isPending}
            onClick={() =>
              setDraft((current) =>
                Object.fromEntries(
                  Object.entries(current).map(([id, d]) => [id, { status: "present", note: d.note }]),
                ),
              )
            }
          >
            <CheckCheck aria-hidden />
            {t("all_present")}
          </Button>
          <Button disabled={save.isPending} onClick={onSave}>
            {save.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
            {isRecorded ? t("update") : t("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
