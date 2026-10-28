"use client";

import { ShieldCheck, UserCog } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { PersonAccess } from "@madrasty/core";
import { PersonAccessDialog } from "@/components/roles/PersonAccessDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePeopleAccess, useStaffRoles } from "@/hooks/queries/roles/useRoles";
import { useErrorMessage } from "@/hooks/useErrorMessage";

export function AccessPanel() {
  const t = useTranslations("access.people");
  const tRoles = useTranslations("roles");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();

  const people = usePeopleAccess();
  const roles = useStaffRoles();
  const [editing, setEditing] = useState<PersonAccess | null>(null);

  const roleNames = new Map((roles.data ?? []).map((role) => [role.id, role.name]));

  const columns: EntityColumn<PersonAccess>[] = [
    {
      key: "name",
      header: t("name"),
      cell: (person) => <span className="font-medium">{person.fullName}</span>,
    },
    {
      key: "type",
      header: t("type"),
      cell: (person) => <span className="text-muted-foreground">{tRoles(person.role)}</span>,
    },
    {
      key: "groups",
      header: t("groups"),
      cell: (person) =>
        person.roleIds.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {person.roleIds.map((id) => (
              <Badge key={id} variant="secondary">
                {roleNames.get(id) ?? "…"}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "extra",
      header: t("extra"),
      cell: (person) =>
        person.permissions.length > 0 ? (
          t("extra_count", { count: person.permissions.length })
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const error = people.error ?? roles.error;
  const isLoading = people.isLoading || roles.isLoading;
  const isEmpty = !isLoading && !error && people.data?.length === 0;

  return (
    <div className="space-y-4">
      {error ? (
        <EmptyState
          icon={ShieldCheck}
          title={toMessage(error)}
          action={
            <Button
              variant="outline"
              onClick={() => void Promise.all([people.refetch(), roles.refetch()])}
            >
              {tc("retry")}
            </Button>
          }
        />
      ) : isEmpty ? (
        <EmptyState icon={UserCog} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <EntityTable
          rows={people.data ?? []}
          columns={columns}
          rowKey={(person) => person.id}
          isLoading={isLoading}
          actionsLabel={tc("actions")}
          actions={(person) => (
            <IconAction icon={ShieldCheck} label={t("edit")} onClick={() => setEditing(person)} />
          )}
        />
      )}

      <PersonAccessDialog
        key={editing?.id ?? "none"}
        person={editing}
        roles={roles.data ?? []}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
