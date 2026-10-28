"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  generateTemporaryPassword,
  resetPasswordSchema,
  type PersonListItem,
  type ResetPasswordInput,
} from "@madrasty/core";
import { TemporaryPasswordField } from "@/components/people/TemporaryPasswordField";
import { FormDialog } from "@/components/shared/FormDialog";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useResetPassword } from "@/hooks/queries/people/usePeople";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "reset-password-form";

export type ResetPasswordDialogProps = {
  person: PersonListItem | null;
  onOpenChange: (open: boolean) => void;
};

export function ResetPasswordDialog({ person, onOpenChange }: ResetPasswordDialogProps) {
  const t = useTranslations("people");
  const toMessage = useErrorMessage();
  const reset = useResetPassword();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: generateTemporaryPassword() },
  });

  const close = () => {
    onOpenChange(false);
    form.reset({ password: generateTemporaryPassword() });
    reset.reset();
  };

  const onSubmit = form.handleSubmit((input) => {
    if (!person) return;
    reset.mutate(
      { id: person.id, input },
      {
        onSuccess: () => {
          notifySuccess(t("reset_done"));
          close();
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    );
  });

  return (
    <FormDialog
      open={Boolean(person)}
      onOpenChange={(next) => !next && close()}
      title={t("reset_title")}
      description={t("reset_description", { name: person?.fullName ?? "" })}
      formId={FORM_ID}
      isPending={reset.isPending}
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <TemporaryPasswordField
            control={form.control}
            name="password"
            label={t("fields.password")}
            description={t("fields.password_hint")}
          />
          {reset.isError && !hasFieldErrors(reset.error) && (
            <FieldError>{toMessage(reset.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
