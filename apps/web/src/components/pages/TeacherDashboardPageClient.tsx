"use client";

import { Activity, CalendarCheck, ClipboardList, Clock, Megaphone, NotebookPen } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { AttentionList, type AttentionItem } from "@/components/dashboard/AttentionList";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeacherDashboard } from "@/hooks/queries/dashboards/useDashboards";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useFeature, useSession } from "@/hooks/useSession";
import { Link } from "@/i18n/navigation";

/** Teacher home: today's lessons and what is waiting on them. */
export function TeacherDashboardPageClient() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const { profile } = useSession();
  const data = useTeacherDashboard();
  const homeworkOn = useFeature("homework");
  const examsOn = useFeature("exams");

  const header = <PageHeader title={t("welcome", { name: profile.fullName })} description={t("teacher_subtitle")} />;

  if (data.isError) {
    return (
      <>
        {header}
        <EmptyState
          icon={Activity}
          title={toMessage(data.error)}
          action={
            <Button variant="outline" onClick={() => void data.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      </>
    );
  }
  if (data.isLoading || !data.data) {
    return (
      <>
        {header}
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </>
    );
  }

  const d = data.data;
  const attention: AttentionItem[] = [
    ...d.attendancePending.map((c) => ({
      key: `att-${c.classId}`,
      icon: CalendarCheck,
      urgent: true,
      href: `/teacher/attendance?class=${c.classId}`,
      label: t("teacher.attendance_pending", { className: c.className }),
    })),
    ...(homeworkOn && d.toGrade > 0
      ? [{ key: "grade", icon: NotebookPen, href: "/teacher/homework", label: t("teacher.to_grade", { count: d.toGrade }) }]
      : []),
    ...(examsOn && d.examsToPublish > 0
      ? [
          {
            key: "publish",
            icon: Megaphone,
            href: "/teacher/exams",
            label: t("teacher.exams_to_publish", { count: d.examsToPublish }),
          },
        ]
      : []),
  ];

  return (
    <>
      {header}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("teacher.lessons_today")}</CardTitle>
          </CardHeader>
          <CardContent>
            {d.lessonsToday.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("teacher.no_lessons")}</p>
            ) : (
              <ul className="divide-y">
                {d.lessonsToday.map((lesson) => (
                  <li key={`${lesson.period}-${lesson.className}`} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {lesson.period}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{lesson.subjectName}</p>
                      <p className="text-sm text-muted-foreground">{lesson.className}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums" dir={isRtl ? "rtl" : "ltr"}>
                      <Clock aria-hidden className="size-3.5" />
                      {lesson.startsAt} – {lesson.endsAt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("attention")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AttentionList items={attention} empty={t("all_clear")} />
          </CardContent>
        </Card>

        {examsOn && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("teacher.upcoming_exams")}</CardTitle>
            </CardHeader>
            <CardContent>
              {d.upcomingExams.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("teacher.no_exams")}</p>
              ) : (
                <ul className="divide-y">
                  {d.upcomingExams.map((exam) => (
                    <li key={exam.id}>
                      <Link
                        href={`/teacher/exams/${exam.id}`}
                        className="flex flex-wrap items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted"
                      >
                        <ClipboardList aria-hidden className="size-4 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{exam.title}</span>
                          <span className="block text-sm text-muted-foreground">
                            {exam.className} ·{" "}
                            {format.dateTime(new Date(exam.startsAt), { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </span>
                        <ExamStatusBadge status={exam.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
