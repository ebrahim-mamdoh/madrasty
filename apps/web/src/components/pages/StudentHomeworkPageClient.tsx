"use client";

import { CalendarClock, Layers, NotebookPen } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { homeworkStatus, type HomeworkStatus, type StudentHomework } from "@madrasty/core";
import { HomeworkStatusBadge } from "@/components/homework/HomeworkStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentHomework } from "@/hooks/queries/homework/useHomework";
import { useMyClass } from "@/hooks/queries/timetable/useTimetable";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { Link } from "@/i18n/navigation";

/** Sections in the order a student should act on them. */
const SECTIONS: HomeworkStatus[] = ["late", "pending", "submitted", "graded"];

export function StudentHomeworkPageClient() {
  const t = useTranslations("homework");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const myClass = useMyClass();
  const homework = useStudentHomework(myClass.data?.id);

  const error = myClass.error ?? homework.error;
  const isLoading = myClass.isLoading || (Boolean(myClass.data) && homework.isLoading);
  const now = new Date();
  const grouped = new Map<HomeworkStatus, StudentHomework[]>(SECTIONS.map((s) => [s, []]));
  for (const item of homework.data ?? []) {
    grouped.get(homeworkStatus(item.dueAt, item.submission, now))!.push(item);
  }
  // Pending work: soonest deadline first.
  grouped.get("pending")!.sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  let body;
  if (error) {
    body = (
      <EmptyState
        icon={NotebookPen}
        title={toMessage(error)}
        action={
          <Button variant="outline" onClick={() => void homework.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  } else if (!isLoading && !myClass.data) {
    body = <EmptyState icon={Layers} title={t("no_class")} />;
  } else if (isLoading) {
    body = (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  } else if ((homework.data ?? []).length === 0) {
    body = <EmptyState icon={NotebookPen} title={t("student_empty")} />;
  } else {
    body = (
      <div className="space-y-8">
        {SECTIONS.filter((section) => grouped.get(section)!.length > 0).map((section) => (
          <section key={section} className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {t(`sections.${section}`)}
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                ({format.number(grouped.get(section)!.length)})
              </span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {grouped.get(section)!.map((item) => (
                <Link key={item.id} href={`/student/homework/${item.id}`} className="group">
                  <Card className="gap-0 py-0 transition-colors group-hover:border-primary/40">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">{item.title}</p>
                        <HomeworkStatusBadge status={section} className="shrink-0" />
                      </div>
                      <p className="text-sm text-muted-foreground">{item.subjectName}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarClock aria-hidden className="size-3.5" />
                        {format.dateTime(new Date(item.dueAt), { dateStyle: "medium", timeStyle: "short" })}
                        {section === "graded" && typeof item.submission?.score === "number" && (
                          <span className="ms-auto font-semibold text-foreground tabular-nums">
                            {format.number(item.submission.score)}
                            {item.maxScore ? ` / ${format.number(item.maxScore)}` : ""}
                          </span>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
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
