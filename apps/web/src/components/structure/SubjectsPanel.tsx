"use client";

import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Subject } from "@madrasty/core";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { SubjectFormDialog } from "@/components/structure/SubjectFormDialog";
import { Button } from "@/components/ui/button";
import { useDeleteSubject, useSubjects } from "@/hooks/queries/structure/useStructure";
import { useCrudDialogs } from "@/hooks/useCrudDialogs";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { usePermission } from "@/hooks/useSession";
import { notifyError, notifySuccess } from "@/lib/utils";

export function SubjectsPanel() {
  const t = useTranslations("structure.subjects");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const canManage = usePermission("structure.manage");

  const subjects = useSubjects();
  const remove = useDeleteSubject();
  const dialogs = useCrudDialogs<Subject>();

  const columns: EntityColumn<Subject>[] = [
    {
      key: "name",
      header: t("name"),
      cell: (subject) => <span className="font-medium">{subject.name}</span>,
    },
    {
      key: "code",
      header: t("code"),
      cell: (subject) => (
        <span className="font-mono text-xs text-muted-foreground" dir="ltr">
          {subject.code ?? "—"}
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

  const isEmpty = !subjects.isLoading && !subjects.isError && subjects.data?.length === 0;

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

      {subjects.isError ? (
        <EmptyState
          icon={BookOpen}
          title={toMessage(subjects.error)}
          action={
            <Button variant="outline" onClick={() => void subjects.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : isEmpty ? (
        <EmptyState icon={BookOpen} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <EntityTable
          rows={subjects.data ?? []}
          columns={columns}
          rowKey={(subject) => subject.id}
          isLoading={subjects.isLoading}
          actionsLabel={tc("actions")}
          actions={
            canManage
              ? (subject) => (
                  <>
                    <IconAction
                      icon={Pencil}
                      label={tc("edit")}
                      onClick={() => dialogs.openEdit(subject)}
                    />
                    <IconAction
                      icon={Trash2}
                      label={tc("delete")}
                      destructive
                      onClick={() => dialogs.askDelete(subject)}
                    />
                  </>
                )
              : undefined
          }
        />
      )}

      <SubjectFormDialog
        key={dialogs.editing?.id ?? "new"}
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        subject={dialogs.editing}
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
