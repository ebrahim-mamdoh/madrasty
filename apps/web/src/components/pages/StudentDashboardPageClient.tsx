"use client";

import { CalendarCheck, ClipboardList, Clock, NotebookPen, Percent } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ATTENDANCE_STATUSES, attendanceRate, homeworkStatus } from "@madrasty/core";
import { AttentionList, type AttentionItem } from "@/components/dashboard/AttentionList";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyAttendance } from "@/hooks/queries/attendance/useAttendance";
import { useStudentExams } from "@/hooks/queries/exams/useExams";
import { useStudentHomework } from "@/hooks/queries/homework/useHomework";
import { useAcademicYears } from "@/hooks/queries/structure/useStructure";
import { useClassTimetable, useMyClass, usePeriods } from "@/hooks/queries/timetable/useTimetable";
import { useFeature, useSession } from "@/hooks/useSession";
import { todayIn } from "@/lib/dates";

/** Student home, composed from the same (cached) queries the student's pages use. */
export function StudentDashboardPageClient() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const format = useFormatter();
  const { profile, school } = useSession();
  const homeworkOn = useFeature("homework");
  const examsOn = useFeature("exams");

  const myClass = useMyClass();
  const classId = myClass.data?.id;
  const timetable = useClassTimetable(classId);
  const periods = usePeriods();
  const homework = useStudentHomework(homeworkOn ? classId : undefined);
  const exams = useStudentExams(examsOn ? classId : undefined);
  const years = useAcademicYears();
  const year = years.data?.find((y) => y.isCurrent);
  const attendance = useMyAttendance(year ? { from: year.startsOn, to: year.endsOn } : undefined);

  const now = new Date();
  const weekday = new Date(`${todayIn(school?.timezone ?? "UTC")}T12:00:00`).getDay();
  const periodById = new Map((periods.data ?? []).map((p) => [p.id, p]));
  const lessons = (timetable.data ?? [])
    .filter((e) => e.weekday === weekday)
    .map((e) => ({ entry: e, period: periodById.get(e.periodId) }))
    .filter((l) => l.period)
    .sort((a, b) => a.period!.number - b.period!.number);

  const counts = Object.fromEntries(
    ATTENDANCE_STATUSES.map((s) => [s, (attendance.data ?? []).filter((r) => r.status === s).length]),
  ) as Record<(typeof ATTENDANCE_STATUSES)[number], number>;
  const rate = attendanceRate(counts);

  const dueHomework = (homework.data ?? []).filter((h) => {
    const status = homeworkStatus(h.dueAt, h.submission, now);
    return status === "pending" || status === "late";
  });
  const upcomingExams = (exams.data ?? []).filter(
    (e) => new Date(e.startsAt).getTime() + e.durationMinutes * 60_000 > now.getTime() && !e.attemptSubmittedAt,
  );

  const attention: AttentionItem[] = [
    ...dueHomework.slice(0, 5).map((h) => ({
      key: `hw-${h.id}`,
      icon: NotebookPen,
      urgent: new Date(h.dueAt) < now,
      href: `/student/homework/${h.id}`,
      label: t("student.homework_due", {
        title: h.title,
        due: format.dateTime(new Date(h.dueAt), { dateStyle: "medium", timeStyle: "short" }),
      }),
    })),
    ...upcomingExams.slice(0, 5).map((e) => ({
      key: `ex-${e.id}`,
      icon: ClipboardList,
      href: "/student/exams",
      label: t("student.exam_upcoming", {
        title: e.title,
        date: format.dateTime(new Date(e.startsAt), { dateStyle: "medium", timeStyle: "short" }),
      }),
    })),
  ];

  return (
    <>
      <PageHeader title={t("welcome", { name: profile.fullName })} description={t("student_subtitle")} />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("student.attendance_rate")}
            value={rate === null ? "—" : format.number(rate / 100, { style: "percent" })}
            icon={Percent}
            isLoading={attendance.isLoading || years.isLoading}
          />
          <StatCard
            label={t("student.absences")}
            value={format.number(counts.absent)}
            icon={CalendarCheck}
            isLoading={attendance.isLoading || years.isLoading}
          />
          {homeworkOn && (
            <StatCard
              label={t("student.homework_open")}
              value={format.number(dueHomework.length)}
              icon={NotebookPen}
              isLoading={homework.isLoading}
            />
          )}
          {examsOn && (
            <StatCard
              label={t("student.exams_upcoming")}
              value={format.number(upcomingExams.length)}
              icon={ClipboardList}
              isLoading={exams.isLoading}
            />
          )}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("student.lessons_today")}</CardTitle>
            </CardHeader>
            <CardContent>
              {lessons.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("student.no_lessons")}</p>
              ) : (
                <ul className="divide-y">
                  {lessons.map(({ entry, period }) => (
                    <li key={entry.id} className="flex items-center gap-3 py-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {period!.number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{entry.subject.name}</p>
                        <p className="text-sm text-muted-foreground">{entry.teacher?.fullName ?? "—"}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums" dir={isRtl ? "rtl" : "ltr"}>
                        <Clock aria-hidden className="size-3.5" />
                        {period!.startsAt} – {period!.endsAt}
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
        </div>
      </div>
    </>
  );
}
