"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ExamQuestion } from "@madrasty/core";
import { IconAction } from "@/components/shared/IconAction";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ListQuestion = Pick<ExamQuestion, "id" | "type" | "text" | "options" | "correctAnswer" | "points">;

export type QuestionListProps<T extends ListQuestion> = {
  questions: T[];
  onEdit?: (question: T) => void;
  onDelete?: (question: T) => void;
};

/** Questions with their correct answers (staff only — students get the paper without them). */
export function QuestionList<T extends ListQuestion>({ questions, onEdit, onDelete }: QuestionListProps<T>) {
  const t = useTranslations("exams.questions");
  const format = useFormatter();

  return (
    <ol className="space-y-3">
      {questions.map((question, index) => (
        <li key={question.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{t(`types.${question.type}`)}</Badge>
                <span className="text-xs text-muted-foreground">
                  {t("points_n", { n: format.number(question.points) })}
                </span>
              </div>
              <p className="whitespace-pre-wrap" dir="auto">
                {question.text}
              </p>
              {question.type === "mcq" && (
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {question.options.map((option, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
                        question.correctAnswer === i && "border-success/40 bg-success/10",
                      )}
                    >
                      {question.correctAnswer === i && (
                        <Check aria-label={t("correct")} className="size-4 text-success" />
                      )}
                      <span dir="auto">{option}</span>
                    </li>
                  ))}
                </ul>
              )}
              {question.type === "true_false" && (
                <p className="text-sm">
                  <span className="text-muted-foreground">{t("correct")}: </span>
                  <span className="font-medium text-success">
                    {question.correctAnswer ? t("true") : t("false")}
                  </span>
                </p>
              )}
            </div>
            {(onEdit || onDelete) && (
              <div className="flex shrink-0 gap-1">
                {onEdit && (
                  <IconAction icon={Pencil} label={t("edit_title")} onClick={() => onEdit(question)} />
                )}
                {onDelete && (
                  <IconAction
                    icon={Trash2}
                    label={t("delete")}
                    destructive
                    onClick={() => onDelete(question)}
                  />
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
