"use client";

import { Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ChangeEvent } from "react";
import {
  HOMEWORK_FILE_MAX_BYTES,
  HOMEWORK_MAX_FILES,
  HOMEWORK_MIME_TYPES,
  isHomeworkMimeType,
  type HomeworkAttachment,
} from "@madrasty/core";
import { AttachmentList } from "@/components/homework/AttachmentList";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

export type AttachmentsValue = {
  /** Already-saved files that stay. */
  kept: HomeworkAttachment[];
  /** Newly picked files, uploaded on save. */
  added: File[];
};

export type AttachmentsFieldProps = {
  label: string;
  value: AttachmentsValue;
  onChange: (value: AttachmentsValue) => void;
  disabled?: boolean;
};

/** Pick up to HOMEWORK_MAX_FILES files (type and size checked here and again by the bucket). */
export function AttachmentsField({ label, value, onChange, disabled }: AttachmentsFieldProps) {
  const t = useTranslations("homework");
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const count = value.kept.length + value.added.length;

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = [...(event.target.files ?? [])];
    event.target.value = "";
    if (picked.length === 0) return;
    if (count + picked.length > HOMEWORK_MAX_FILES) {
      return setError(t("too_many_files", { max: HOMEWORK_MAX_FILES }));
    }
    if (picked.some((file) => !isHomeworkMimeType(file.type))) return setError(t("file_type"));
    if (picked.some((file) => file.size > HOMEWORK_FILE_MAX_BYTES)) return setError(t("file_size"));
    setError(null);
    onChange({ ...value, added: [...value.added, ...picked] });
  };

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <AttachmentList
        attachments={[...value.kept, ...value.added]}
        onRemove={
          disabled
            ? undefined
            : (index) =>
                onChange(
                  index < value.kept.length
                    ? { ...value, kept: value.kept.filter((_, i) => i !== index) }
                    : {
                        ...value,
                        added: value.added.filter((_, i) => i !== index - value.kept.length),
                      },
                )
        }
      />
      {!disabled && count < HOMEWORK_MAX_FILES && (
        <div>
          <Button type="button" variant="outline" size="sm" asChild>
            <label htmlFor={inputId} className="cursor-pointer">
              <Paperclip aria-hidden />
              {t("add_files")}
            </label>
          </Button>
          <input
            id={inputId}
            type="file"
            multiple
            accept={HOMEWORK_MIME_TYPES.join(",")}
            className="sr-only"
            onChange={onPick}
          />
        </div>
      )}
      <FieldDescription>{t("files_hint", { max: HOMEWORK_MAX_FILES })}</FieldDescription>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
