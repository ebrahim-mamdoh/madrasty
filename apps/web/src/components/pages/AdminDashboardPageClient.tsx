"use client";

import {
  Activity,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers,
  NotebookPen,
  Users,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { attendanceRate } from "@madrasty/core";
import { AttentionList, type AttentionItem } from "@/components/dashboard/AttentionList";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminDashboard } from "@/hooks/queries/dashboards/useDashboards";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useFeature, usePermission, useSession } from "@/hooks/useSession";

/** Admin home: the school at a glance and what needs attention. Each block follows the viewer's permissions. */
export function AdminDashboardPageClient() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const { profile } = useSession();
  const data = useAdminDashboard();
  // Hooks first (never behind `&&`), then combine permissions with plan features.
  const has = {
    students: usePermission("students.view"),
    teachers: usePermission("teachers.view"),
    structure: usePermission("structure.view"),
    attendance: usePermission("attendance.view"),
    exams: usePermission("exams.view"),
    homework: usePermission("homework.view"),
    reports: usePermission("reports.view"),
    monitoring: usePermission("monitoring.view"),
  };
  const enabled = {
    exams: useFeature("exams"),
    homework: useFeature("homework"),
    reports: useFeature("monthly_reports"),
  };
  const can = {
    ...has,
    exams: has.exams && enabled.exams,
    homework: has.homework && enabled.homework,
    reports: has.reports && enabled.reports,
  };

  if (data.isError) {
    return (
      <>
        <PageHeader title={t("welcome", { name: profile.fullName })} description={t("admin_subtitle")} />
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

  const d = data.data;
  const isLoading = data.isLoading;
  const rate = d ? attendanceRate(d.attendance) : null;

  const attention: AttentionItem[] = [];
  if (d) {
    if (can.exams && d.examsPending > 0) {
      attention.push({
        key: "pending",
        icon: ClipboardList,
        urgent: true,
        href: "/admin/exams",
        label: t("admin.exams_pending", { count: d.examsPending }),
      });
    }
    if (can.attendance && d.isStudyDay && d.attendance.classesRecorded < d.classes) {
      attention.push({
        key: "attendance",
        icon: CalendarCheck,
        urgent: true,
        href: "/admin/attendance",
        label: t("admin.attendance_missing", { count: d.classes - d.attendance.classesRecorded }),
      });
    }
    if (can.exams && d.examsUpcoming > 0) {
      attention.push({
        key: "upcoming",
        icon: ClipboardCheck,
        href: "/admin/exams?tab=all",
        label: t("admin.exams_upcoming", { count: d.examsUpcoming }),
      });
    }
    if (can.homework && d.homeworkDue > 0) {
      attention.push({
        key: "homework",
        icon: NotebookPen,
        href: "/admin/homework",
        label: t("admin.homework_due", { count: d.homeworkDue }),
      });
    }
    if (can.reports) {
      attention.push({
        key: "reports",
        icon: FileText,
        href: "/admin/reports",
        label: t("admin.reports_sent", { count: d.reportsSent }),
      });
    }
    if (can.monitoring) {
      attention.push({ key: "monitoring", icon: Activity, href: "/admin/monitoring", label: t("admin.monitoring") });
    }
  }

  return (
    <>
      <PageHeader title={t("welcome", { name: profile.fullName })} description={t("admin_subtitle")} />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {can.students && (
            <StatCard label={t("admin.students")} value={d && format.number(d.students)} icon={GraduationCap} isLoading={isLoading} />
          )}
          {can.teachers && (
            <StatCard label={t("admin.teachers")} value={d && format.number(d.teachers)} icon={Users} isLoading={isLoading} />
          )}
          {can.structure && (
            <StatCard label={t("admin.classes")} value={d && format.number(d.classes)} icon={Layers} isLoading={isLoading} />
          )}
          {can.attendance && (
            <StatCard
              label={t("admin.attendance_today")}
              value={rate === null ? "—" : format.number(rate / 100, { style: "percent" })}
              icon={CalendarCheck}
              isLoading={isLoading}
            />
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {can.attendance && d && (
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.today")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["present", "absent", "late", "excused"] as const).map((status) => (
                  <div key={status} className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums">{format.number(d.attendance[status])}</p>
                    <p className="text-xs text-muted-foreground">{t(`admin.status.${status}`)}</p>
                  </div>
                ))}
                <p className="col-span-full text-sm text-muted-foreground">
                  {d.isStudyDay
                    ? t("admin.classes_recorded", { recorded: d.attendance.classesRecorded, total: d.classes })
                    : t("admin.no_study_day")}
                </p>
              </CardContent>
            </Card>
          )}
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
