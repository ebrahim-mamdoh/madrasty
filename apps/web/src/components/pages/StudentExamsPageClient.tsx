"use client";

import { CalendarClock, ClipboardList, Layers, Monitor, PlayCircle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { StudentExam } from "@madrasty/core";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentExams } from "@/hooks/queries/exams/useExams";
import { useMyClass } from "@/hooks/queries/timetable/useTimetable";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { Link } from "@/i18n/navigation";

type Bucket = "open" | "upcoming" | "done";

function bucketOf(exam: StudentExam, now: Date): Bucket {
  const starts = new Date(exam.startsAt);
  const ends = new Date(starts.getTime() + exam.durationMinutes * 60_000);
  if (
    exam.mode === "online" &&
    exam.status === "approved" &&
    !exam.attemptSubmittedAt &&
    now >= starts &&
    now <= ends
  ) {
    return "open";
  }
  return now < starts ? "upcoming" : "done";
}

export function StudentExamsPageClient() {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const myClass = useMyClass();
  const exams = useStudentExams(myClass.data?.id);
  const now = new Date();

  const error = myClass.error ?? exams.error;
  const isLoading = myClass.isLoading || (Boolean(myClass.data) && exams.isLoading);
  const buckets: Record<Bucket, StudentExam[]> = { open: [], upcoming: [], done: [] };
  for (const exam of exams.data ?? []) buckets[bucketOf(exam, now)].push(exam);
  buckets.done.reverse();

  const card = (exam: StudentExam, bucket: Bucket) => (
    <Card key={exam.id} className="gap-0 py-0">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{exam.title}</p>
          <Badge variant="secondary" className="shrink-0">
            {t(`kinds.${exam.kind}`)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{exam.subjectName}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {exam.mode === "online" ? <Monitor aria-hidden className="size-3.5" /> : <CalendarClock aria-hidden className="size-3.5" />}
          {format.dateTime(new Date(exam.startsAt), { dateStyle: "medium", timeStyle: "short" })}
          {" · "}
          {t("minutes", { n: exam.durationMinutes })}
        </p>
        {bucket === "open" && (
          <Button asChild size="sm" className="mt-1">
            <Link href={`/student/exams/${exam.id}`}>
              <PlayCircle aria-hidden />
              {t("room.enter")}
            </Link>
          </Button>
        )}
        {bucket === "done" && (
          <p className="text-sm">
            {exam.status === "published" && exam.score !== null ? (
              <span className="font-semibold tabular-nums">
                {t("your_score", { score: format.number(exam.score), max: format.number(exam.maxScore) })}
              </span>
            ) : (
              <span className="text-muted-foreground">{t("awaiting_results")}</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );

  let body;
  if (error) {
    body = (
      <EmptyState
        icon={ClipboardList}
        title={toMessage(error)}
        action={
          <Button variant="outline" onClick={() => void exams.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  } else if (!isLoading && !myClass.data) {
    body = <EmptyState icon={Layers} title={t("no_class")} />;
  } else if (isLoading) {
    body = <Skeleton className="h-40" />;
  } else if ((exams.data ?? []).length === 0) {
    body = <EmptyState icon={ClipboardList} title={t("student_empty")} />;
  } else {
    body = (
      <div className="space-y-8">
        {(["open", "upcoming", "done"] as const)
          .filter((b) => buckets[b].length > 0)
          .map((bucket) => (
            <section key={bucket} className="space-y-3">
              <h2 className="text-lg font-semibold">{t(`buckets.${bucket}`)}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {buckets[bucket].map((exam) => card(exam, bucket))}
              </div>
            </section>
          ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("student_subtitle")} />
      {body}
    </>
  );
}
