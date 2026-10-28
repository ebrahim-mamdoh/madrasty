"use client";

import { Trophy } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { StudentGrade } from "@madrasty/core";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyGrades } from "@/hooks/queries/exams/useExams";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { cn } from "@/lib/utils";

/** Student → published results grouped by subject (monthly, midterm, final, quizzes). */
export function StudentGradesPageClient() {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const grades = useMyGrades();

  const bySubject = new Map<string, StudentGrade[]>();
  for (const grade of grades.data ?? []) {
    bySubject.set(grade.subjectName, [...(bySubject.get(grade.subjectName) ?? []), grade]);
  }

  let body;
  if (grades.isError) {
    body = (
      <EmptyState
        icon={Trophy}
        title={toMessage(grades.error)}
        action={
          <Button variant="outline" onClick={() => void grades.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  } else if (grades.isLoading) {
    body = <Skeleton className="h-48" />;
  } else if (bySubject.size === 0) {
    body = <EmptyState icon={Trophy} title={t("grades_empty")} />;
  } else {
    body = (
      <div className="grid gap-4 lg:grid-cols-2">
        {[...bySubject.entries()].map(([subject, list]) => {
          const percent =
            list.reduce((sum, g) => sum + g.score / g.maxScore, 0) / Math.max(list.length, 1);
          return (
            <Card key={subject}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>{subject}</CardTitle>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    percent >= 0.85 ? "text-success" : percent >= 0.6 ? "text-warning" : "text-destructive",
                  )}
                >
                  {format.number(percent, { style: "percent" })}
                </span>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {list.map((grade) => (
                    <li key={grade.examId} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{grade.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format.dateTime(new Date(grade.startsAt), { dateStyle: "medium" })}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary">{t(`kinds.${grade.kind}`)}</Badge>
                        <span className="w-20 text-end font-semibold tabular-nums">
                          {format.number(grade.score)} / {format.number(grade.maxScore)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t("my_grades")} description={t("my_grades_subtitle")} />
      {body}
    </>
  );
}
