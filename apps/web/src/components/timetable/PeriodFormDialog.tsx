"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  periodSchema,
  type Period,
  type PeriodFormValues,
  type PeriodInput,
} from "@madrasty/core";
import { FormDialog } from "@/components/shared/FormDialog";
import { TextField } from "@/components/shared/form/TextField";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useSavePeriod } from "@/hooks/queries/timetable/useTimetable";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "period-form";

export type PeriodFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: Period | null;
  /** Suggested values for a new period (next number, starting when the last one ends). */
  suggestion: PeriodFormValues;
};

export function PeriodFormDialog({ open, onOpenChange, period, suggestion }: PeriodFormDialogProps) {
  const t = useTranslations("timetable.periods");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSavePeriod();

  const defaults: PeriodFormValues = period
    ? { number: String(period.number), startsAt: period.startsAt, endsAt: period.endsAt }
    : suggestion;
  const form = useForm<PeriodFormValues, unknown, PeriodInput>({
    resolver: zodResolver(periodSchema),
    defaultValues: defaults,
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    save.reset();
  };

  const onSubmit = form.handleSubmit((input) =>
    save.mutate(
      { id: period?.id, input },
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
      title={period ? t("edit_title") : t("create_title")}
      formId={FORM_ID}
      isPending={save.isPending}
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <TextField
            control={form.control}
            name="number"
            label={t("number")}
            type="number"
            inputMode="numeric"
            dir="ltr"
            autoFocus
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="startsAt"
              label={t("starts_at")}
              type="time"
              dir="ltr"
            />
            <TextField
              control={form.control}
              name="endsAt"
              label={t("ends_at")}
              type="time"
              dir="ltr"
            />
          </div>
          {save.isError && !hasFieldErrors(save.error) && (
            <FieldError>{toMessage(save.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
