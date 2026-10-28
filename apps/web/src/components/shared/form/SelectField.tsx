"use client";

import { useId } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useErrorMessage } from "@/hooks/useErrorMessage";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  /** Adds a first option that maps to "" (Radix Select cannot hold an empty value itself). */
  emptyOptionLabel?: string;
  disabled?: boolean;
  className?: string;
};

const EMPTY = "__empty__";

/** Labelled select bound to react-hook-form; zod messages are i18n keys and get translated here. */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  emptyOptionLabel,
  disabled,
  className,
}: SelectFieldProps<T>) {
  const toMessage = useErrorMessage();
  const id = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select
            name={field.name}
            value={field.value === "" && emptyOptionLabel ? EMPTY : field.value || undefined}
            onValueChange={(value) => field.onChange(value === EMPTY ? "" : value)}
            disabled={disabled}
          >
            <SelectTrigger id={id} aria-invalid={fieldState.invalid} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {emptyOptionLabel && <SelectItem value={EMPTY}>{emptyOptionLabel}</SelectItem>}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error && (
            <FieldError errors={[{ message: toMessage(fieldState.error.message) }]} />
          )}
        </Field>
      )}
    />
  );
}
