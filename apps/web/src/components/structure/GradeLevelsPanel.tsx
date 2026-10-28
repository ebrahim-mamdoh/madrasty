"use client";

import { ArrowDown, ArrowUp, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { GradeLevel } from "@madrasty/core";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { GradeLevelFormDialog } from "@/components/structure/GradeLevelFormDialog";
import { Button } from "@/components/ui/button";
import {
  useDeleteGradeLevel,
  useGradeLevels,
  useReorderGradeLevels,
} from "@/hooks/queries/structure/useStructure";
import { useCrudDialogs } from "@/hooks/useCrudDialogs";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { usePermission } from "@/hooks/useSession";
import { notifyError, notifySuccess } from "@/lib/utils";

/** Swaps an item with its neighbour and returns the new id order. */
function moved(ids: string[], index: number, offset: -1 | 1): string[] {
  const next = [...ids];
  const target = index + offset;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function GradeLevelsPanel() {
  const t = useTranslations("structure.grades");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const canManage = usePermission("structure.manage");

  const grades = useGradeLevels();
  const remove = useDeleteGradeLevel();
  const reorder = useReorderGradeLevels();
  const dialogs = useCrudDialogs<GradeLevel>();

  const rows = grades.data ?? [];
  const ids = rows.map((grade) => grade.id);

  const columns: EntityColumn<GradeLevel>[] = [
    {
      key: "order",
      header: t("order"),
      cell: (grade) => format.number(ids.indexOf(grade.id) + 1),
      className: "w-20 tabular-nums text-muted-foreground",
    },
    {
      key: "name",
      header: t("name"),
      cell: (grade) => <span className="font-medium">{grade.name}</span>,
    },
    {
      key: "classes",
      header: t("classes"),
      cell: (grade) => format.number(grade.classesCount),
      className: "text-end tabular-nums",
    },
  ];

  const move = (index: number, offset: -1 | 1) =>
    reorder.mutate(moved(ids, index, offset), {
      onError: (error) => notifyError(toMessage(error)),
    });

  const onConfirmDelete = () => {
    if (!dialogs.deleting) return;
    remove.mutate(dialogs.deleting.id, {
      onSuccess: () => notifySuccess(tc("deleted")),
      onError: (error) => notifyError(toMessage(error)),
      onSettled: dialogs.closeDelete,
    });
  };

  const isEmpty = !grades.isLoading && !grades.isError && rows.length === 0;

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

      {grades.isError ? (
        <EmptyState
          icon={Layers}
          title={toMessage(grades.error)}
          action={
            <Button variant="outline" onClick={() => void grades.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : isEmpty ? (
        <EmptyState icon={Layers} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <EntityTable
          rows={rows}
          columns={columns}
          rowKey={(grade) => grade.id}
          isLoading={grades.isLoading}
          actionsLabel={tc("actions")}
          actions={
            canManage
              ? (grade) => {
                  const index = ids.indexOf(grade.id);
                  return (
                    <>
                      <IconAction
                        icon={ArrowUp}
                        label={t("move_up")}
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                      />
                      <IconAction
                        icon={ArrowDown}
                        label={t("move_down")}
                        disabled={index === rows.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                      />
                      <IconAction
                        icon={Pencil}
                        label={tc("edit")}
                        onClick={() => dialogs.openEdit(grade)}
                      />
                      <IconAction
                        icon={Trash2}
                        label={grade.classesCount > 0 ? t("in_use") : tc("delete")}
                        destructive
                        disabled={grade.classesCount > 0}
                        onClick={() => dialogs.askDelete(grade)}
                      />
                    </>
                  );
                }
              : undefined
          }
        />
      )}

      <GradeLevelFormDialog
        key={dialogs.editing?.id ?? "new"}
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        gradeLevel={dialogs.editing}
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
