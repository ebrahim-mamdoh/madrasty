"use client";

import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { StaffRole } from "@madrasty/core";
import { RoleFormDialog } from "@/components/roles/RoleFormDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { Button } from "@/components/ui/button";
import { useDeleteStaffRole, useStaffRoles } from "@/hooks/queries/roles/useRoles";
import { useCrudDialogs } from "@/hooks/useCrudDialogs";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifyError, notifySuccess } from "@/lib/utils";

export function RolesPanel() {
  const t = useTranslations("access.roles");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();

  const roles = useStaffRoles();
  const remove = useDeleteStaffRole();
  const dialogs = useCrudDialogs<StaffRole>();

  const columns: EntityColumn<StaffRole>[] = [
    {
      key: "name",
      header: t("name"),
      cell: (role) => <span className="font-medium">{role.name}</span>,
    },
    {
      key: "permissions",
      header: t("permissions"),
      cell: (role) => (
        <span className="text-muted-foreground">
          {t("permissions_count", { count: role.permissions.length })}
        </span>
      ),
    },
    {
      key: "members",
      header: t("members"),
      cell: (role) => <span className="tabular-nums">{format.number(role.membersCount)}</span>,
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

  const isEmpty = !roles.isLoading && !roles.isError && roles.data?.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={dialogs.openCreate}>
          <Plus aria-hidden />
          {t("add")}
        </Button>
      </div>

      {roles.isError ? (
        <EmptyState
          icon={ShieldCheck}
          title={toMessage(roles.error)}
          action={
            <Button variant="outline" onClick={() => void roles.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : isEmpty ? (
        <EmptyState icon={ShieldCheck} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <EntityTable
          rows={roles.data ?? []}
          columns={columns}
          rowKey={(role) => role.id}
          isLoading={roles.isLoading}
          actionsLabel={tc("actions")}
          actions={(role) => (
            <>
              <IconAction icon={Pencil} label={tc("edit")} onClick={() => dialogs.openEdit(role)} />
              <IconAction
                icon={Trash2}
                label={tc("delete")}
                destructive
                onClick={() => dialogs.askDelete(role)}
              />
            </>
          )}
        />
      )}

      <RoleFormDialog
        key={dialogs.editing?.id ?? "new"}
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        role={dialogs.editing}
      />
      <ConfirmDialog
        open={Boolean(dialogs.deleting)}
        onOpenChange={(open) => !open && dialogs.closeDelete()}
        title={t("delete_title")}
        description={t("delete_description", {
          name: dialogs.deleting?.name ?? "",
          count: dialogs.deleting?.membersCount ?? 0,
        })}
        isPending={remove.isPending}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
