"use client";

import { useId } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/hooks/useErrorMessage";

export type TextareaFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
};

/** Labelled multi-line input bound to react-hook-form; zod messages are i18n keys. */
export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  rows = 4,
  maxLength,
}: TextareaFieldProps<T>) {
  const toMessage = useErrorMessage();
  const id = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Textarea
            {...field}
            id={id}
            rows={rows}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            className="max-h-80"
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.error && (
            <FieldError errors={[{ message: toMessage(fieldState.error.message) }]} />
          )}
        </Field>
      )}
    />
  );
}
