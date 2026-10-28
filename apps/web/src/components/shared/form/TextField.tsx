"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ComponentProps } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { cn } from "@/lib/utils";

export type TextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  className?: string;
} & Pick<
  ComponentProps<"input">,
  "type" | "autoComplete" | "placeholder" | "dir" | "inputMode" | "autoFocus"
>;

/** Labelled input bound to react-hook-form; zod messages are i18n keys and get translated here. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  type = "text",
  ...inputProps
}: TextFieldProps<T>) {
  const t = useTranslations("common");
  const toMessage = useErrorMessage();
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <div className="relative">
            <Input
              {...field}
              {...inputProps}
              id={id}
              type={isPassword && revealed ? "text" : type}
              aria-invalid={fieldState.invalid}
              className={cn(isPassword && "pe-10")}
            />
            {isPassword && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 end-0 h-full text-muted-foreground"
                aria-label={t(revealed ? "hide_password" : "show_password")}
                onClick={() => setRevealed((v) => !v)}
              >
                {revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </Button>
            )}
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
