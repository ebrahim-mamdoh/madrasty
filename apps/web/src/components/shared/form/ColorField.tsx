"use client";

import { useId } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useErrorMessage } from "@/hooks/useErrorMessage";

export type ColorFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
};

/** Native color swatch + editable hex value, both bound to the same form field. */
export function ColorField<T extends FieldValues>({ control, name, label }: ColorFieldProps<T>) {
  const toMessage = useErrorMessage();
  const id = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(field.value) ? field.value : "#000000"}
              onChange={(event) => field.onChange(event.target.value)}
              aria-label={label}
              className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
            />
            <Input
              {...field}
              id={id}
              dir="ltr"
              autoComplete="off"
              maxLength={7}
              aria-invalid={fieldState.invalid}
              className="font-mono uppercase"
            />
          </div>
          {fieldState.error && (
            <FieldError errors={[{ message: toMessage(fieldState.error.message) }]} />
          )}
        </Field>
      )}
    />
  );
}
