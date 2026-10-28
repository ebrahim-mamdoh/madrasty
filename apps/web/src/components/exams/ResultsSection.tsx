"use client";

import { Eye, Loader2, Save, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { parseScore, type Exam, type ExamResultEntry } from "@madrasty/core";
import { AnswersDialog } from "@/components/exams/AnswersDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { IconAction } from "@/components/shared/IconAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExamResults, useSaveResults } from "@/hooks/queries/exams/useExams";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { cn, notifyError, notifySuccess } from "@/lib/utils";

/** Every student's score: typed for paper exams, auto-scored then adjustable for online ones. */
export function ResultsSection({ exam, editable }: { exam: Exam; editable: boolean }) {
  const t = useTranslations("exams");
  const toMessage = useErrorMessage();
  const results = useExamResults(exam);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("results")}</h2>
        <p className="text-sm text-muted-foreground">
          {editable ? t("results_hint") : exam.status === "published" ? t("results_published") : t("results_readonly")}
        </p>
      </div>
      {results.isError ? (
        <EmptyState icon={Users} title={toMessage(results.error)} />
      ) : results.isLoading || !results.data ? (
        <Skeleton className="h-40" />
      ) : results.data.length === 0 ? (
        <EmptyState icon={Users} title={t("no_students")} />
      ) : (
        <ResultsTable key={results.dataUpdatedAt} exam={exam} entries={results.data} editable={editable} />
      )}
    </section>
  );
}

function ResultsTable({
  exam,
  entries,
  editable,
}: {
  exam: Exam;
  entries: ExamResultEntry[];
  editable: boolean;
}) {
  const t = useTranslations("exams");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const save = useSaveResults();
  const [viewing, setViewing] = useState<ExamResultEntry | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(entries.map((e) => [e.studentId, e.score === null ? "" : String(e.score)])),
  );

  const parsed = Object.fromEntries(
    entries.map((e) => [e.studentId, parseScore(draft[e.studentId] ?? "", exam.maxScore)]),
  );
  const hasInvalid = Object.values(parsed).some((v) => v === "invalid");
  const changed = entries.filter((e) => parsed[e.studentId] !== e.score);
  const scored = Object.values(parsed).filter((v): v is number => typeof v === "number");
  const average = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null;

  const onSave = () =>
    save.mutate(
      {
        examId: exam.id,
        rows: changed.map((e) => ({ studentId: e.studentId, score: parsed[e.studentId] as number | null })),
      },
      {
        onSuccess: () => notifySuccess(t("results_saved")),
        onError: (error) => notifyError(toMessage(error)),
      },
    );

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-start font-medium">{t("student")}</th>
              {exam.mode === "online" && <th className="p-3 text-start font-medium">{t("attempt")}</th>}
              <th className="w-40 p-3 text-start font-medium">
                {t("score_out_of", { max: format.number(exam.maxScore) })}
              </th>
              {exam.mode === "online" && <th className="w-12 p-3" />}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const value = parsed[entry.studentId];
              return (
                <tr key={entry.studentId} className="border-t">
                  <td className="p-3 font-medium">{entry.fullName}</td>
                  {exam.mode === "online" && (
                    <td className="p-3 text-muted-foreground">
                      {entry.attempt?.submittedAt
                        ? t("attempt_submitted", {
                            score: format.number(entry.attempt.autoScore ?? 0),
                          })
                        : entry.attempt
                          ? t("attempt_open")
                          : t("attempt_none")}
                    </td>
                  )}
                  <td className="p-2">
                    {editable ? (
                      <Input
                        value={draft[entry.studentId] ?? ""}
                        onChange={(event) =>
                          setDraft((d) => ({ ...d, [entry.studentId]: event.target.value }))
                        }
                        inputMode="decimal"
                        dir="ltr"
                        aria-label={t("score_for", { name: entry.fullName })}
                        aria-invalid={value === "invalid"}
                        className={cn("h-8 w-28", value === "invalid" && "border-destructive")}
                      />
                    ) : (
                      <span className="font-semibold tabular-nums">
                        {entry.score === null ? "—" : format.number(entry.score)}
                      </span>
                    )}
                  </td>
                  {exam.mode === "online" && (
                    <td className="p-2">
                      {entry.attempt?.submittedAt && (
                        <IconAction icon={Eye} label={t("view_answers")} onClick={() => setViewing(entry)} />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {average === null
            ? t("no_scores")
            : t("average", { avg: format.number(average, { maximumFractionDigits: 2 }) })}
        </p>
        {editable && (
          <div className="flex items-center gap-3">
            {hasInvalid && <p className="text-sm text-destructive">{t("invalid_scores")}</p>}
            <Button onClick={onSave} disabled={save.isPending || hasInvalid || changed.length === 0}>
              {save.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
              {t("save_results")}
            </Button>
          </div>
        )}
      </div>

      <AnswersDialog examId={exam.id} entry={viewing} onOpenChange={(open) => !open && setViewing(null)} />
    </>
  );
}
