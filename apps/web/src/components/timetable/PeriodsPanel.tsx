"use client";

import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_PERIODS, type Period, type PeriodFormValues } from "@madrasty/core";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { PeriodFormDialog } from "@/components/timetable/PeriodFormDialog";
import { StudyDaysCard } from "@/components/timetable/StudyDaysCard";
import { Button } from "@/components/ui/button";
import { useDeletePeriod, usePeriods } from "@/hooks/queries/timetable/useTimetable";
import { useCrudDialogs } from "@/hooks/useCrudDialogs";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { usePermission, useSession } from "@/hooks/useSession";
import { notifyError, notifySuccess } from "@/lib/utils";

/** `HH:MM` + minutes, clamped to the same day. */
function addMinutes(time: string, minutes: number): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function nextPeriodSuggestion(periods: Period[]): PeriodFormValues {
  const last = periods.at(-1);
  if (!last) return { number: "1", startsAt: "08:00", endsAt: "08:45" };
  return {
    number: String(Math.min(last.number + 1, MAX_PERIODS)),
    startsAt: last.endsAt,
    endsAt: addMinutes(last.endsAt, 45),
  };
}

export function PeriodsPanel() {
  const t = useTranslations("timetable.periods");
  const tt = useTranslations("timetable");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const canManage = usePermission("structure.manage");
  const { school } = useSession();

  const periods = usePeriods();
  const remove = useDeletePeriod();
  const dialogs = useCrudDialogs<Period>();

  const columns: EntityColumn<Period>[] = [
    {
      key: "number",
      header: t("number"),
      cell: (period) => <span className="font-medium">{tt("period_n", { n: period.number })}</span>,
    },
    {
      key: "time",
      header: t("time"),
      cell: (period) => (
        <span className="tabular-nums text-muted-foreground" dir="ltr">
          {period.startsAt} – {period.endsAt}
        </span>
      ),
    },
  ];

  const onConfirmDelete = () => {
    if (!dialogs.deleting) return;
    remove.mutate(dialogs.deleting.id, {
      onSuccess: () => notifySuccess(tc("deleted")),
      onError: (error) => notifyError(toMessage(error)),
      onSettled: dialogs.closeDelete,
    });
  };

  const rows = periods.data ?? [];
  const isEmpty = !periods.isLoading && !periods.isError && rows.length === 0;

  return (
    <div className="space-y-6">
      <StudyDaysCard
        key={school?.studyDays.join() ?? ""}
        days={school?.studyDays ?? []}
        canManage={canManage}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          {canManage && (
            <Button onClick={dialogs.openCreate} disabled={rows.length >= MAX_PERIODS}>
              <Plus aria-hidden />
              {t("add")}
            </Button>
          )}
        </div>

        {periods.isError ? (
          <EmptyState
            icon={Clock}
            title={toMessage(periods.error)}
            action={
              <Button variant="outline" onClick={() => void periods.refetch()}>
                {tc("retry")}
              </Button>
            }
          />
        ) : isEmpty ? (
          <EmptyState icon={Clock} title={t("empty")} description={t("empty_hint")} />
        ) : (
          <EntityTable
            rows={rows}
            columns={columns}
            rowKey={(period) => period.id}
            isLoading={periods.isLoading}
            actionsLabel={tc("actions")}
            actions={
              canManage
                ? (period) => (
                    <>
                      <IconAction
                        icon={Pencil}
                        label={tc("edit")}
                        onClick={() => dialogs.openEdit(period)}
                      />
                      <IconAction
                        icon={Trash2}
                        label={tc("delete")}
                        destructive
                        onClick={() => dialogs.askDelete(period)}
                      />
                    </>
                  )
                : undefined
            }
          />
        )}
      </div>

      <PeriodFormDialog
        key={dialogs.editing?.id ?? `new-${rows.length}`}
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        period={dialogs.editing}
        suggestion={nextPeriodSuggestion(rows)}
      />
      <ConfirmDialog
        open={Boolean(dialogs.deleting)}
        onOpenChange={(open) => !open && dialogs.closeDelete()}
        title={t("delete_title")}
        description={t("delete_description", { n: dialogs.deleting?.number ?? 0 })}
        isPending={remove.isPending}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
