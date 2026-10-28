"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  addSchoolAdminSchema,
  generateTemporaryPassword,
  type AddSchoolAdminInput,
} from "@madrasty/core";
import { TemporaryPasswordField } from "@/components/people/TemporaryPasswordField";
import { FormDialog } from "@/components/shared/FormDialog";
import { TextField } from "@/components/shared/form/TextField";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useAddSchoolAdmin } from "@/hooks/queries/schools/useSchools";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "add-school-admin-form";

export type AddSchoolAdminDialogProps = {
  schoolId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddSchoolAdminDialog({ schoolId, open, onOpenChange }: AddSchoolAdminDialogProps) {
  const t = useTranslations("platform.school");
  const tp = useTranslations("people");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const add = useAddSchoolAdmin();

  const freshValues = (): AddSchoolAdminInput => ({
    fullName: "",
    email: "",
    password: generateTemporaryPassword(),
  });
  const form = useForm<AddSchoolAdminInput>({
    resolver: zodResolver(addSchoolAdminSchema),
    defaultValues: freshValues(),
  });

  const close = () => {
    onOpenChange(false);
    form.reset(freshValues());
    add.reset();
  };

  const onSubmit = form.handleSubmit((input) =>
    add.mutate(
      { schoolId, input },
      {
        onSuccess: () => {
          notifySuccess(t("admin_added"));
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
      title={t("add_admin_title")}
      formId={FORM_ID}
      isPending={add.isPending}
      submitLabel={tc("create")}
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <TextField control={form.control} name="fullName" label={tp("fields.full_name")} autoFocus />
          <TextField
            control={form.control}
            name="email"
            label={tp("fields.email")}
            description={tp("fields.email_hint")}
            type="email"
            dir="ltr"
            autoComplete="off"
          />
          <TemporaryPasswordField
            control={form.control}
            name="password"
            label={tp("fields.password")}
            description={tp("fields.password_hint")}
          />
          {add.isError && !hasFieldErrors(add.error) && (
            <FieldError>{toMessage(add.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
