"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  REPORT_CRITERIA,
  reportSchema,
  type ReportCriterion,
  type ReportRosterEntry,
} from "@madrasty/core";
import { FormDialog } from "@/components/shared/FormDialog";
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useSaveReport } from "@/hooks/queries/reports/useReports";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { cn, notifySuccess } from "@/lib/utils";

const FORM_ID = "report-form";

export type ReportDialogProps = {
  classId: string;
  month: string;
  entry: ReportRosterEntry | null;
  /** Sent reports (or readers without write access) are shown read-only. */
  readOnly: boolean;
  onOpenChange: (open: boolean) => void;
};

/** One student's monthly report: four 1–5 ratings plus academic and behaviour notes. */
export function ReportDialog({ classId, month, entry, readOnly, onOpenChange }: ReportDialogProps) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSaveReport();
  const report = entry?.report ?? null;

  const [ratings, setRatings] = useState<Partial<Record<ReportCriterion, number>>>(report?.ratings ?? {});
  const [academicNote, setAcademicNote] = useState(report?.academicNote ?? "");
  const [behaviorNote, setBehaviorNote] = useState(report?.behaviorNote ?? "");

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!entry || readOnly) return;
    const input = reportSchema.parse({ ratings, academicNote, behaviorNote });
    save.mutate(
      { classId, studentId: entry.studentId, month, input },
      {
        onSuccess: () => {
          notifySuccess(tc("saved"));
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <FormDialog
      open={Boolean(entry)}
      onOpenChange={onOpenChange}
      title={entry?.fullName ?? ""}
      description={report?.status === "sent" ? t("sent_locked") : t("draft_hint")}
      formId={FORM_ID}
      isPending={save.isPending}
      submitLabel={readOnly ? tc("close") : t("save_draft")}
      className="sm:max-w-2xl"
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={
          readOnly
            ? (event) => {
                event.preventDefault();
                onOpenChange(false);
              }
            : onSubmit
        }
      >
        <FieldGroup>
          <Field>
            <FieldTitle>{t("ratings")}</FieldTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {REPORT_CRITERIA.map((criterion) => (
                <div key={criterion} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <span className="text-sm">{t(`criteria.${criterion}`)}</span>
                  <div role="radiogroup" aria-label={t(`criteria.${criterion}`)} className="flex gap-0.5" dir="ltr">
                    {[1, 2, 3, 4, 5].map((value) => {
                      const active = (ratings[criterion] ?? 0) >= value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={ratings[criterion] === value}
                          aria-label={t("rating_n", { n: value })}
                          disabled={readOnly}
                          onClick={() =>
                            setRatings((current) =>
                              current[criterion] === value
                                ? Object.fromEntries(Object.entries(current).filter(([k]) => k !== criterion))
                                : { ...current, [criterion]: value },
                            )
                          }
                          className="rounded p-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default"
                        >
                          <Star
                            aria-hidden
                            className={cn("size-5", active ? "fill-warning text-warning" : "text-muted-foreground/40")}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="academic-note">{t("academic_note")}</FieldLabel>
            <Textarea
              id="academic-note"
              value={academicNote}
              onChange={(event) => setAcademicNote(event.target.value)}
              rows={4}
              maxLength={2000}
              readOnly={readOnly}
              placeholder={t("academic_placeholder")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="behavior-note">{t("behavior_note")}</FieldLabel>
            <Textarea
              id="behavior-note"
              value={behaviorNote}
              onChange={(event) => setBehaviorNote(event.target.value)}
              rows={3}
              maxLength={2000}
              readOnly={readOnly}
              placeholder={t("behavior_placeholder")}
            />
          </Field>
          {save.isError && <FieldError>{toMessage(save.error)}</FieldError>}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
