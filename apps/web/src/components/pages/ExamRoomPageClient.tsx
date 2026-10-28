"use client";

import { ArrowRight, CheckCircle2, Clock, Loader2, PlayCircle, Send } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ExamAnswers, ExamPaper } from "@madrasty/core";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useStartExam, useSubmitExam } from "@/hooks/queries/exams/useExams";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useSession } from "@/hooks/useSession";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Answers are kept on the device while solving so a dropped connection loses nothing. */
function storageKey(examId: string, studentId: string) {
  return `madrasty:exam:${examId}:${studentId}`;
}

function loadAnswers(key: string): ExamAnswers {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ExamAnswers) : {};
  } catch {
    return {};
  }
}

function saveAnswers(key: string, answers: ExamAnswers) {
  try {
    window.localStorage.setItem(key, JSON.stringify(answers));
  } catch {
    // Private mode / full storage: the in-memory answers still get submitted.
  }
}

function clearAnswers(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clean up.
  }
}

/**
 * Student → the online exam room. The paper is fetched once (start_exam), answers live on the
 * device, and everything is sent in one request at the end (or automatically when time runs out).
 */
export function ExamRoomPageClient({ examId }: { examId: string }) {
  const t = useTranslations("exams.room");
  const toMessage = useErrorMessage();
  const { profile } = useSession();
  const start = useStartExam();

  const back = (
    <Button variant="ghost" size="sm" className="mb-2 -ms-2" asChild>
      <Link href="/student/exams">
        <ArrowRight aria-hidden className="ltr:rotate-180" />
        {t("back")}
      </Link>
    </Button>
  );

  if (!start.data) {
    return (
      <>
        {back}
        <Card className="mx-auto max-w-lg">
          <CardContent className="space-y-4 p-6 text-center">
            <PlayCircle aria-hidden className="mx-auto size-12 text-primary" />
            <p className="text-lg font-semibold">{t("ready_title")}</p>
            <p className="text-sm text-muted-foreground">{t("ready_hint")}</p>
            {start.isError && <p className="text-sm text-destructive">{toMessage(start.error)}</p>}
            <Button size="lg" disabled={start.isPending} onClick={() => start.mutate(examId)}>
              {start.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <PlayCircle aria-hidden />}
              {t("start")}
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return <ExamPaperView paper={start.data} storage={storageKey(examId, profile.id)} back={back} />;
}

function ExamPaperView({
  paper,
  storage,
  back,
}: {
  paper: ExamPaper;
  storage: string;
  back: React.ReactNode;
}) {
  const t = useTranslations("exams.room");
  const tq = useTranslations("exams.questions");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const submit = useSubmitExam();
  const [answers, setAnswers] = useState<ExamAnswers>(() => loadAnswers(storage));
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const endsAt = new Date(paper.exam.endsAt).getTime();
  const remaining = Math.max(0, endsAt - now);
  const submittedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const send = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    submit.mutate(
      { examId: paper.exam.id, answers },
      {
        onSuccess: () => clearAnswers(storage),
        onError: () => {
          // Allow another try (answers are still saved on the device).
          submittedRef.current = false;
        },
        onSettled: () => setConfirming(false),
      },
    );
  }, [answers, paper.exam.id, storage, submit]);

  // Time is up: hand in automatically.
  useEffect(() => {
    if (remaining === 0 && !submit.isSuccess) send();
  }, [remaining, send, submit.isSuccess]);

  const answer = (questionId: string, value: number | boolean | string) =>
    setAnswers((current) => {
      const next = { ...current, [questionId]: value };
      saveAnswers(storage, next);
      return next;
    });

  if (submit.isSuccess) {
    return (
      <>
        {back}
        <Card className="mx-auto max-w-lg">
          <CardContent className="space-y-3 p-6 text-center">
            <CheckCircle2 aria-hidden className="mx-auto size-12 text-success" />
            <p className="text-lg font-semibold">{t("submitted_title")}</p>
            <p className="text-sm text-muted-foreground">{t("submitted_hint")}</p>
          </CardContent>
        </Card>
      </>
    );
  }

  const answered = paper.questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== "").length;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <>
      <PageHeader
        title={paper.exam.title}
        description={t("progress", { answered, total: paper.questions.length })}
        actions={
          <span
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-lg tabular-nums",
              remaining < 5 * 60_000 && "border-destructive/40 bg-destructive/10 text-destructive",
            )}
            role="timer"
            aria-label={t("time_left")}
            dir="ltr"
          >
            <Clock aria-hidden className="size-4" />
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        }
      />
      {paper.exam.instructions && (
        <p className="mb-6 rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap" dir="auto">
          {paper.exam.instructions}
        </p>
      )}

      <ol className="space-y-4">
        {paper.questions.map((question, index) => (
          <li key={question.id}>
            <Card className="gap-0 py-0">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium whitespace-pre-wrap" dir="auto">
                    {index + 1}. {question.text}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {tq("points_n", { n: format.number(question.points) })}
                  </span>
                </div>
                {question.type === "short" ? (
                  <Textarea
                    value={String(answers[question.id] ?? "")}
                    onChange={(event) => answer(question.id, event.target.value)}
                    rows={3}
                    maxLength={2000}
                    aria-label={t("your_answer", { n: index + 1 })}
                  />
                ) : (
                  <div role="radiogroup" aria-label={t("your_answer", { n: index + 1 })} className="grid gap-2 sm:grid-cols-2">
                    {(question.type === "mcq"
                      ? question.options.map((label, i) => ({ value: i as number | boolean, label }))
                      : [
                          { value: true as number | boolean, label: tq("true") },
                          { value: false as number | boolean, label: tq("false") },
                        ]
                    ).map((option) => {
                      const checked = answers[question.id] === option.value;
                      return (
                        <button
                          key={String(option.value)}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          onClick={() => answer(question.id, option.value)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2 text-start text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            checked ? "border-primary bg-primary/10" : "hover:bg-muted",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-4 shrink-0 place-items-center rounded-full border",
                              checked && "border-primary",
                            )}
                          >
                            {checked && <span className="size-2 rounded-full bg-primary" />}
                          </span>
                          <span dir="auto">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {submit.isError && <p className="text-sm text-destructive">{toMessage(submit.error)}</p>}
        <Button size="lg" disabled={submit.isPending} onClick={() => setConfirming(true)}>
          {submit.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
          {t("submit")}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("confirm_title")}
        description={t("confirm_description", { answered, total: paper.questions.length })}
        confirmLabel={t("submit")}
        destructive={false}
        isPending={submit.isPending}
        onConfirm={send}
      />
    </>
  );
}
