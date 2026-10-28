"use client";

import { BookOpen, Layers, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClassSubjectsWithTeachers, useMyClass } from "@/hooks/queries/timetable/useTimetable";
import { useErrorMessage } from "@/hooks/useErrorMessage";

/** Student → the subjects of their class this year and who teaches each. */
export function MySubjectsPageClient() {
  const t = useTranslations("subjects_page");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const myClass = useMyClass();
  const subjects = useClassSubjectsWithTeachers(myClass.data?.id);

  const error = myClass.error ?? subjects.error;
  const isLoading = myClass.isLoading || (Boolean(myClass.data) && subjects.isLoading);
  const title = myClass.data ? `${t("title")} — ${myClass.data.name}` : t("title");

  let body;
  if (error) {
    body = (
      <EmptyState
        icon={BookOpen}
        title={toMessage(error)}
        action={
          <Button variant="outline" onClick={() => void subjects.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  } else if (!isLoading && !myClass.data) {
    body = <EmptyState icon={Layers} title={t("no_class")} />;
  } else if (!isLoading && (subjects.data ?? []).length === 0) {
    body = <EmptyState icon={BookOpen} title={t("empty")} />;
  } else {
    body = (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : (subjects.data ?? []).map((subject) => (
              <Card key={subject.id} className="gap-0 py-0">
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{subject.subjectName}</p>
                    {subject.subjectCode && (
                      <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                        {subject.subjectCode}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <UserRound aria-hidden className="size-3.5" />
                      {subject.teacherName ?? t("no_teacher")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader title={title} description={t("subtitle")} />
      {body}
    </>
  );
}
