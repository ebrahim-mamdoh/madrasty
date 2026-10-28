"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  MAX_MCQ_OPTIONS,
  QUESTION_TYPES,
  questionSchema,
  toQuestionInput,
  type ExamQuestion,
  type QuestionFormOutput,
  type QuestionFormValues,
  type QuestionInput,
} from "@madrasty/core";
import { FormDialog } from "@/components/shared/FormDialog";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { TextareaField } from "@/components/shared/form/TextareaField";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { cn } from "@/lib/utils";

const FORM_ID = "question-form";

function toFormValues(question: Pick<ExamQuestion, "type" | "text" | "options" | "correctAnswer" | "points"> | null): QuestionFormValues {
  if (!question) return { type: "mcq", text: "", options: ["", ""], correct: "", points: "1" };
  return {
    type: question.type,
    text: question.text,
    options: question.type === "mcq" ? question.options : ["", ""],
    correct:
      question.correctAnswer === null ? "" : String(question.correctAnswer),
    points: String(question.points),
  };
}

export type QuestionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Pick<ExamQuestion, "type" | "text" | "options" | "correctAnswer" | "points"> | null;
  isPending: boolean;
  error: unknown;
  onSave: (input: QuestionInput) => void;
};

/** MCQ (2–6 options, one correct), true/false, or short answer (graded by the teacher). */
export function QuestionFormDialog({
  open,
  onOpenChange,
  question,
  isPending,
  error,
  onSave,
}: QuestionFormDialogProps) {
  const t = useTranslations("exams.questions");
  const toMessage = useErrorMessage();
  const form = useForm<QuestionFormValues, unknown, QuestionFormOutput>({
    resolver: zodResolver(questionSchema),
    defaultValues: toFormValues(question),
  });
  const type = useWatch({ control: form.control, name: "type" });

  const onSubmit = form.handleSubmit((values) => onSave(toQuestionInput(values)));

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(toFormValues(question));
        onOpenChange(next);
      }}
      title={question ? t("edit_title") : t("create_title")}
      formId={FORM_ID}
      isPending={isPending}
      className="sm:max-w-2xl"
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="type"
              label={t("type")}
              options={QUESTION_TYPES.map((value) => ({ value, label: t(`types.${value}`) }))}
            />
            <TextField
              control={form.control}
              name="points"
              label={t("points")}
              type="number"
              inputMode="decimal"
              dir="ltr"
            />
          </div>
          <TextareaField control={form.control} name="text" label={t("text")} rows={3} maxLength={2000} />

          {type === "mcq" && (
            <Controller
              control={form.control}
              name="options"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldTitle>{t("options")}</FieldTitle>
                  <FieldDescription>{t("options_hint")}</FieldDescription>
                  <Controller
                    control={form.control}
                    name="correct"
                    render={({ field: correct, fieldState: correctState }) => (
                      <div className="space-y-2" role="radiogroup" aria-label={t("correct")}>
                        {field.value.map((option, index) => {
                          const isCorrect = correct.value === String(index);
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <button
                                type="button"
                                role="radio"
                                aria-checked={isCorrect}
                                aria-label={t("mark_correct", { n: index + 1 })}
                                onClick={() => correct.onChange(String(index))}
                                className={cn(
                                  "grid size-5 shrink-0 place-items-center rounded-full border outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                  isCorrect && "border-success bg-success text-white",
                                )}
                              >
                                {isCorrect && <span className="size-2 rounded-full bg-current" />}
                              </button>
                              <Input
                                value={option}
                                onChange={(event) =>
                                  field.onChange(
                                    field.value.map((v, i) => (i === index ? event.target.value : v)),
                                  )
                                }
                                placeholder={t("option_n", { n: index + 1 })}
                                aria-label={t("option_n", { n: index + 1 })}
                                maxLength={300}
                                dir="auto"
                              />
                              {field.value.length > 2 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t("remove_option", { n: index + 1 })}
                                  onClick={() => {
                                    field.onChange(field.value.filter((_, i) => i !== index));
                                    if (correct.value === String(index)) correct.onChange("");
                                    else if (Number(correct.value) > index)
                                      correct.onChange(String(Number(correct.value) - 1));
                                  }}
                                >
                                  <X aria-hidden />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        {correctState.error && (
                          <FieldError errors={[{ message: toMessage(correctState.error.message) }]} />
                        )}
                      </div>
                    )}
                  />
                  {field.value.length < MAX_MCQ_OPTIONS && (
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange([...field.value, ""])}
                      >
                        <Plus aria-hidden />
                        {t("add_option")}
                      </Button>
                    </div>
                  )}
                  {fieldState.error && (
                    <FieldError errors={[{ message: toMessage(fieldState.error.message) }]} />
                  )}
                </Field>
              )}
            />
          )}

          {type === "true_false" && (
            <SelectField
              control={form.control}
              name="correct"
              label={t("correct")}
              placeholder={t("choose_correct")}
              options={[
                { value: "true", label: t("true") },
                { value: "false", label: t("false") },
              ]}
            />
          )}

          {type === "short" && <FieldDescription>{t("short_hint")}</FieldDescription>}

          {Boolean(error) && <FieldError>{toMessage(error)}</FieldError>}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
