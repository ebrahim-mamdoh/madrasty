"use client";

import { CalendarRange, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { AcademicYear } from "@madrasty/core";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { AcademicYearFormDialog } from "@/components/structure/AcademicYearFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useAcademicYears,
  useDeleteAcademicYear,
  useSetCurrentAcademicYear,
} from "@/hooks/queries/structure/useStructure";
import { useCrudDialogs } from "@/hooks/useCrudDialogs";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { usePermission } from "@/hooks/useSession";
import { localDate } from "@/lib/dates";
import { notifyError, notifySuccess } from "@/lib/utils";

export function AcademicYearsPanel() {
  const t = useTranslations("structure.years");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const canManage = usePermission("structure.manage");

  const years = useAcademicYears();
  const remove = useDeleteAcademicYear();
  const setCurrent = useSetCurrentAcademicYear();
  const dialogs = useCrudDialogs<AcademicYear>();

  const columns: EntityColumn<AcademicYear>[] = [
    {
      key: "name",
      header: t("name"),
      cell: (year) => (
        <div className="flex items-center gap-2">
          <span className="font-medium" dir="ltr">
            {year.name}
          </span>
          {year.isCurrent && <Badge className="bg-primary/10 text-primary">{t("current")}</Badge>}
        </div>
      ),
    },
    {
      key: "starts",
      header: t("starts_on"),
      cell: (year) => format.dateTime(localDate(year.startsOn), { dateStyle: "medium" }),
      className: "text-muted-foreground",
    },
    {
      key: "ends",
      header: t("ends_on"),
      cell: (year) => format.dateTime(localDate(year.endsOn), { dateStyle: "medium" }),
      className: "text-muted-foreground",
    },
    {
      key: "classes",
      header: t("classes"),
      cell: (year) => format.number(year.classesCount),
      className: "text-end tabular-nums",
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

  const onSetCurrent = (year: AcademicYear) =>
    setCurrent.mutate(year.id, {
      onSuccess: () => notifySuccess(t("current_updated")),
      onError: (error) => notifyError(toMessage(error)),
    });

  const isEmpty = !years.isLoading && !years.isError && years.data?.length === 0;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={dialogs.openCreate}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        </div>
      )}

      {years.isError ? (
        <EmptyState
          icon={CalendarRange}
          title={toMessage(years.error)}
          action={
            <Button variant="outline" onClick={() => void years.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : isEmpty ? (
        <EmptyState icon={CalendarRange} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <EntityTable
          rows={years.data ?? []}
          columns={columns}
          rowKey={(year) => year.id}
          isLoading={years.isLoading}
          actionsLabel={tc("actions")}
          actions={
            canManage
              ? (year) => (
                  <>
                    {!year.isCurrent && (
                      <IconAction
                        icon={Star}
                        label={t("set_current")}
                        disabled={setCurrent.isPending}
                        onClick={() => onSetCurrent(year)}
                      />
                    )}
                    <IconAction
                      icon={Pencil}
                      label={tc("edit")}
                      onClick={() => dialogs.openEdit(year)}
                    />
                    <IconAction
                      icon={Trash2}
                      label={year.classesCount > 0 ? t("in_use") : tc("delete")}
                      destructive
                      disabled={year.classesCount > 0}
                      onClick={() => dialogs.askDelete(year)}
                    />
                  </>
                )
              : undefined
          }
        />
      )}

      <AcademicYearFormDialog
        key={dialogs.editing?.id ?? "new"}
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        year={dialogs.editing}
      />
      <ConfirmDialog
        open={Boolean(dialogs.deleting)}
        onOpenChange={(open) => !open && dialogs.closeDelete()}
        title={t("delete_title")}
        description={t("delete_description", { name: dialogs.deleting?.name ?? "" })}
        isPending={remove.isPending}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
