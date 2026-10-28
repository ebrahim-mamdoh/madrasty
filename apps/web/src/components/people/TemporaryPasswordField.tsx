"use client";

import { Copy, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { generateTemporaryPassword } from "@madrasty/core";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifySuccess } from "@/lib/utils";

export type TemporaryPasswordFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
};

/**
 * Password set by an admin for someone else: shown in clear text (it has to be handed over),
 * with one-click generation and copy.
 */
export function TemporaryPasswordField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: TemporaryPasswordFieldProps<T>) {
  const t = useTranslations("people");
  const toMessage = useErrorMessage();
  const id = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <div className="flex gap-2">
            <Input
              {...field}
              id={id}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={fieldState.invalid}
              className="font-mono"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => field.onChange(generateTemporaryPassword())}
            >
              <RefreshCw aria-hidden />
              {t("generate")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("copy")}
              disabled={!field.value}
              onClick={() =>
                void navigator.clipboard
                  .writeText(String(field.value))
                  .then(() => notifySuccess(t("copied")))
              }
            >
              <Copy aria-hidden />
            </Button>
          </div>
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.error && (
            <FieldError errors={[{ message: toMessage(fieldState.error.message) }]} />
          )}
        </Field>
      )}
    />
  );
}
