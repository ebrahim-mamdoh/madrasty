"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  generateTemporaryPassword,
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@madrasty/core";
import { TemporaryPasswordField } from "@/components/people/TemporaryPasswordField";
import { FormDialog } from "@/components/shared/FormDialog";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "reset-password-form";

export type ResetPasswordMutation = UseMutationResult<
  void,
  Error,
  { id: string; input: ResetPasswordInput }
>;

export type ResetPasswordDialogProps = {
  person: { id: string; fullName: string } | null;
  onOpenChange: (open: boolean) => void;
  /** School people and school admins reset through different server actions. */
  reset: ResetPasswordMutation;
};

export function ResetPasswordDialog({ person, onOpenChange, reset }: ResetPasswordDialogProps) {
  const t = useTranslations("people");
  const toMessage = useErrorMessage();

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
