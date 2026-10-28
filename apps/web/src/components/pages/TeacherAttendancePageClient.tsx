"use client";

import { DoorOpen } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { AttendanceSheet } from "@/components/attendance/AttendanceSheet";
import { ClassPicker } from "@/components/attendance/ClassPicker";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyClasses } from "@/hooks/queries/teaching/useTeaching";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useSession } from "@/hooks/useSession";
import { useUrlState } from "@/hooks/useUrlState";
import { localDate, todayIn } from "@/lib/dates";

/** Teacher → today's sheet for one of their classes (the DB only accepts today from teachers). */
export function TeacherAttendancePageClient() {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const { school } = useSession();
  const { searchParams, setParams } = useUrlState();
  const today = todayIn(school?.timezone ?? "UTC");

  const classes = useMyClasses();
  const classList = classes.data ?? [];
  const requested = searchParams.get("class");
  const classId = classList.some((c) => c.id === requested) ? requested! : classList[0]?.id;

  const subtitle = t("teacher_subtitle", {
    date: format.dateTime(localDate(today), { dateStyle: "full" }),
  });

  let body;
  if (classes.isError) {
    body = (
      <EmptyState
        icon={DoorOpen}
        title={toMessage(classes.error)}
        action={
          <Button variant="outline" onClick={() => void classes.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  } else if (!classes.isLoading && classList.length === 0) {
    body = <EmptyState icon={DoorOpen} title={t("teacher_no_classes")} />;
  } else {
    body = (
      <div className="space-y-4">
        {classes.isLoading ? (
          <Skeleton className="h-9 w-60" />
        ) : (
          <ClassPicker
            classes={classList.map((c) => ({ id: c.id, name: c.name, detail: c.gradeLevelName }))}
            value={classId}
            onChange={(value) => setParams({ class: value })}
            label={t("class")}
          />
        )}
        {classId && <AttendanceSheet classId={classId} date={today} canEdit />}
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t("title")} description={subtitle} />
      {body}
    </>
  );
}
