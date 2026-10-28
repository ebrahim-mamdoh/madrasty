"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { staffRoleSchema, type StaffRole, type StaffRoleInput } from "@madrasty/core";
import { PermissionMatrix } from "@/components/roles/PermissionMatrix";
import { FormDialog } from "@/components/shared/FormDialog";
import { TextField } from "@/components/shared/form/TextField";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldTitle,
} from "@/components/ui/field";
import { useSaveStaffRole } from "@/hooks/queries/roles/useRoles";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "staff-role-form";

export type RoleFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: StaffRole | null;
};

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const t = useTranslations("access.roles");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSaveStaffRole();

  const defaults: StaffRoleInput = { name: role?.name ?? "", permissions: role?.permissions ?? [] };
  const form = useForm<StaffRoleInput>({
    resolver: zodResolver(staffRoleSchema),
    defaultValues: defaults,
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    save.reset();
  };

  const onSubmit = form.handleSubmit((input) =>
    save.mutate(
      { id: role?.id, input },
      {
        onSuccess: () => {
          notifySuccess(tc("saved"));
          close();
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    ),
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={role ? t("edit_title") : t("create_title")}
      formId={FORM_ID}
      isPending={save.isPending}
      className="sm:max-w-3xl"
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <TextField
            control={form.control}
            name="name"
            label={t("name")}
            placeholder={t("name_placeholder")}
            autoFocus
          />
          <Controller
            control={form.control}
            name="permissions"
            render={({ field }) => (
              <Field>
                <FieldTitle>{t("permissions")}</FieldTitle>
                <FieldDescription>{t("permissions_hint")}</FieldDescription>
                <PermissionMatrix
                  label={t("permissions")}
                  value={field.value}
                  onChange={field.onChange}
                />
              </Field>
            )}
          />
          {save.isError && !hasFieldErrors(save.error) && (
            <FieldError>{toMessage(save.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
