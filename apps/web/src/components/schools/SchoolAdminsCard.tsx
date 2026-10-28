"use client";

import { KeyRound, Plus, Power, PowerOff, UserCog } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { SchoolAdmin } from "@madrasty/core";
import { ResetPasswordDialog } from "@/components/people/ResetPasswordDialog";
import { AddSchoolAdminDialog } from "@/components/schools/AddSchoolAdminDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useResetSchoolAdminPassword,
  useSchoolAdmins,
  useSetSchoolAdminActive,
} from "@/hooks/queries/schools/useSchools";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifyError, notifySuccess } from "@/lib/utils";

/** The school's admin accounts; only the platform owner manages them. */
export function SchoolAdminsCard({ schoolId }: { schoolId: string }) {
  const t = useTranslations("platform.school");
  const tp = useTranslations("people");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();

  const admins = useSchoolAdmins(schoolId);
  const setActive = useSetSchoolAdminActive();
  const resetPassword = useResetSchoolAdminPassword();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<SchoolAdmin | null>(null);
  const [deactivating, setDeactivating] = useState<SchoolAdmin | null>(null);

  const toggleActive = (admin: SchoolAdmin, active: boolean) =>
    setActive.mutate(
      { id: admin.id, active },
      {
        onSuccess: () => notifySuccess(active ? tp("activated") : tp("deactivated")),
        onError: (error) => notifyError(toMessage(error)),
        onSettled: () => setDeactivating(null),
      },
    );

  const columns: EntityColumn<SchoolAdmin>[] = [
    {
      key: "name",
      header: tp("fields.full_name"),
      cell: (admin) => (
        <div className="min-w-0">
          <p className="font-medium">{admin.fullName}</p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">
            {admin.email}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: tp("fields.status"),
      cell: (admin) =>
        admin.isActive ? (
          <StatusBadge tone="success" label={tp("active")} />
        ) : (
          <StatusBadge tone="muted" label={tp("inactive")} />
        ),
    },
  ];

  const isEmpty = !admins.isLoading && !admins.isError && admins.data?.length === 0;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{t("admins_title")}</CardTitle>
        <CardAction>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            {t("add_admin")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {admins.isError ? (
          <EmptyState
            icon={UserCog}
            title={toMessage(admins.error)}
            action={
              <Button variant="outline" onClick={() => void admins.refetch()}>
                {tc("retry")}
              </Button>
            }
          />
        ) : isEmpty ? (
          <EmptyState icon={UserCog} title={t("no_admins")} />
        ) : (
          <EntityTable
            rows={admins.data ?? []}
            columns={columns}
            rowKey={(admin) => admin.id}
            isLoading={admins.isLoading}
            actionsLabel={tc("actions")}
            actions={(admin) => (
              <>
                <IconAction
                  icon={KeyRound}
                  label={tp("reset_password")}
                  onClick={() => setResetting(admin)}
                />
                {admin.isActive ? (
                  <IconAction
                    icon={PowerOff}
                    label={tp("deactivate")}
                    destructive
                    onClick={() => setDeactivating(admin)}
                  />
                ) : (
                  <IconAction
                    icon={Power}
                    label={tp("activate")}
                    disabled={setActive.isPending}
                    onClick={() => toggleActive(admin, true)}
                  />
                )}
              </>
            )}
          />
        )}
      </CardContent>

      <AddSchoolAdminDialog schoolId={schoolId} open={adding} onOpenChange={setAdding} />
      <ResetPasswordDialog
        key={resetting?.id ?? "none"}
        person={resetting}
        onOpenChange={(open) => !open && setResetting(null)}
        reset={resetPassword}
      />
      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={tp("deactivate_title", { name: deactivating?.fullName ?? "" })}
        description={tp("deactivate_description")}
        confirmLabel={tp("deactivate")}
        isPending={setActive.isPending}
        onConfirm={() => deactivating && toggleActive(deactivating, false)}
      />
    </Card>
  );
}
