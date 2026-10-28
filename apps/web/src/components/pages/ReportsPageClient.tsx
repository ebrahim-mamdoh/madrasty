"use client";

import { DoorOpen, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { ClassPicker } from "@/components/attendance/ClassPicker";
import { ReportsSheet } from "@/components/reports/ReportsSheet";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcademicYears, useClasses } from "@/hooks/queries/structure/useStructure";
import { useMyClasses } from "@/hooks/queries/teaching/useTeaching";
import { usePermission, useSession } from "@/hooks/useSession";
import { useUrlState } from "@/hooks/useUrlState";
import { todayIn } from "@/lib/dates";

type ClassOption = { id: string; name: string; detail?: string };

/** Teacher → their classes; admin → every class (writing and sending need reports.send). */
export function ReportsPageClient({ viewer }: { viewer: "admin" | "teacher" }) {
  return viewer === "admin" ? <AdminReports /> : <TeacherReports />;
}

function AdminReports() {
  const years = useAcademicYears();
  const currentYearId = years.data?.find((y) => y.isCurrent)?.id;
  const classes = useClasses(currentYearId);
  const canSend = usePermission("reports.send");
  return (
    <ReportsView
      subtitleKey="admin_subtitle"
      classes={(classes.data ?? []).map((c) => ({ id: c.id, name: c.name, detail: c.gradeLevel.name }))}
      isLoading={years.isLoading || classes.isLoading}
      canWrite={canSend}
    />
  );
}

function TeacherReports() {
  const classes = useMyClasses();
  return (
    <ReportsView
      subtitleKey="teacher_subtitle"
      classes={(classes.data ?? []).map((c) => ({ id: c.id, name: c.name, detail: c.gradeLevelName }))}
      isLoading={classes.isLoading}
      canWrite
    />
  );
}

function ReportsView({
  subtitleKey,
  classes,
  isLoading,
  canWrite,
}: {
  subtitleKey: "admin_subtitle" | "teacher_subtitle";
  classes: ClassOption[];
  isLoading: boolean;
  canWrite: boolean;
}) {
  const t = useTranslations("reports");
  const { school } = useSession();
  const { searchParams, setParams } = useUrlState();
  const thisMonth = todayIn(school?.timezone ?? "UTC").slice(0, 7);
  const requestedMonth = searchParams.get("month");
  const month = requestedMonth && requestedMonth <= thisMonth ? requestedMonth : thisMonth;
  const requestedClass = searchParams.get("class");
  const classId = classes.some((c) => c.id === requestedClass) ? requestedClass! : classes[0]?.id;

  return (
    <>
      <PageHeader title={t("title")} description={t(subtitleKey)} />
      {!isLoading && classes.length === 0 ? (
        <EmptyState icon={subtitleKey === "teacher_subtitle" ? DoorOpen : Layers} title={t("no_classes")} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-60" />
            ) : (
              <ClassPicker
                classes={classes}
                value={classId}
                onChange={(value) => setParams({ class: value })}
                label={t("class")}
              />
            )}
            <Input
              type="month"
              value={month}
              max={thisMonth}
              onChange={(event) => event.target.value && setParams({ month: event.target.value })}
              aria-label={t("month")}
              className="w-48"
              dir="ltr"
            />
          </div>
          {classId && <ReportsSheet key={`${classId}:${month}`} classId={classId} month={month} canWrite={canWrite} />}
        </div>
      )}
    </>
  );
}
