"use client";

import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { AttendanceReportPanel } from "@/components/attendance/AttendanceReportPanel";
import { AttendanceSheet } from "@/components/attendance/AttendanceSheet";
import { ClassPicker } from "@/components/attendance/ClassPicker";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAcademicYears, useClasses } from "@/hooks/queries/structure/useStructure";
import { usePermission, useSession } from "@/hooks/useSession";
import { useUrlState } from "@/hooks/useUrlState";
import { todayIn } from "@/lib/dates";

const TABS = ["daily", "report"] as const;
type AttendanceTab = (typeof TABS)[number];

function isTab(value: string | null): value is AttendanceTab {
  return (TABS as readonly (string | null)[]).includes(value);
}

/** Admin → Attendance: any class, any past day (editable with attendance.record) + monthly report. */
export function AdminAttendancePageClient() {
  const t = useTranslations("attendance");
  const canRecord = usePermission("attendance.record");
  const { school } = useSession();
  const { searchParams, setParams } = useUrlState();
  const today = todayIn(school?.timezone ?? "UTC");

  const years = useAcademicYears();
  const currentYearId = years.data?.find((year) => year.isCurrent)?.id;
  const classes = useClasses(currentYearId);
  const classList = classes.data ?? [];

  const requestedTab = searchParams.get("tab");
  const tab: AttendanceTab = isTab(requestedTab) ? requestedTab : "daily";
  const requestedClass = searchParams.get("class");
  const classId = classList.some((c) => c.id === requestedClass)
    ? requestedClass!
    : classList[0]?.id;
  const requestedDate = searchParams.get("date");
  const date = requestedDate && requestedDate <= today ? requestedDate : today;
  const month = searchParams.get("month") ?? today.slice(0, 7);

  const isLoading = years.isLoading || classes.isLoading;
  const noClasses = !isLoading && (!currentYearId || classList.length === 0);

  return (
    <>
      <PageHeader title={t("title")} description={t("admin_subtitle")} />
      {noClasses ? (
        <EmptyState icon={Layers} title={t("no_classes")} />
      ) : (
        <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <TabsList className="h-auto flex-wrap">
              {TABS.map((key) => (
                <TabsTrigger key={key} value={key}>
                  {t(`tabs.${key}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            {isLoading ? (
              <Skeleton className="h-9 w-60" />
            ) : (
              <ClassPicker
                classes={classList.map((c) => ({ id: c.id, name: c.name, detail: c.gradeLevel.name }))}
                value={classId}
                onChange={(value) => setParams({ class: value })}
                label={t("class")}
              />
            )}
          </div>

          <TabsContent value="daily">
            {tab === "daily" && classId && (
              <div className="space-y-4">
                <Input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => event.target.value && setParams({ date: event.target.value })}
                  aria-label={t("date")}
                  className="w-48"
                  dir="ltr"
                />
                <AttendanceSheet classId={classId} date={date} canEdit={canRecord} />
              </div>
            )}
          </TabsContent>
          <TabsContent value="report">
            {tab === "report" && (
              <AttendanceReportPanel
                classId={classId}
                month={month}
                onMonthChange={(value) => setParams({ month: value })}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
