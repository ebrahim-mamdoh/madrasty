"use client";

import { CalendarClock, Clock, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { orderStudyDays } from "@madrasty/core";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { Button } from "@/components/ui/button";
import {
  useClassTimetable,
  useMyClass,
  useMySchedule,
  usePeriods,
} from "@/hooks/queries/timetable/useTimetable";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useSession } from "@/hooks/useSession";

/** Teacher → their week across classes; student → their class's week. */
export function MySchedulePageClient({ viewer }: { viewer: "teacher" | "student" }) {
  return viewer === "teacher" ? <TeacherSchedule /> : <StudentSchedule />;
}

function TeacherSchedule() {
  const entries = useMySchedule();
  return (
    <ScheduleView
      subtitleKey="teacher_subtitle"
      entries={entries}
      detail="class"
      emptyKey="teacher_empty"
    />
  );
}

function StudentSchedule() {
  const t = useTranslations("timetable.my");
  const myClass = useMyClass();
  const entries = useClassTimetable(myClass.data?.id);

  if (!myClass.isLoading && !myClass.isError && !myClass.data) {
    return (
      <>
        <PageHeader title={t("title")} description={t("student_subtitle")} />
        <EmptyState icon={Layers} title={t("no_class")} />
      </>
    );
  }
  return (
    <ScheduleView
      subtitleKey="student_subtitle"
      className={myClass.data?.name}
      entries={{
        ...entries,
        isLoading: myClass.isLoading || entries.isLoading,
        error: myClass.error ?? entries.error,
      }}
      detail="teacher"
      emptyKey="student_empty"
    />
  );
}

type ScheduleViewProps = {
  subtitleKey: "teacher_subtitle" | "student_subtitle";
  className?: string;
  entries: Pick<ReturnType<typeof useMySchedule>, "data" | "isLoading" | "error" | "refetch">;
  detail: "teacher" | "class";
  emptyKey: "teacher_empty" | "student_empty";
};

function ScheduleView({ subtitleKey, className, entries, detail, emptyKey }: ScheduleViewProps) {
  const t = useTranslations("timetable.my");
  const tt = useTranslations("timetable");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const { school } = useSession();
  const periods = usePeriods();

  const error = periods.error ?? entries.error;
  const isLoading = periods.isLoading || entries.isLoading;
  const title = className ? `${t("title")} — ${className}` : t("title");

  let body;
  if (error) {
    body = (
      <EmptyState
        icon={CalendarClock}
        title={toMessage(error)}
        action={
          <Button variant="outline" onClick={() => void entries.refetch()}>
            {tc("retry")}
          </Button>
        }
      />
    );
  } else if (!isLoading && (periods.data ?? []).length === 0) {
    body = <EmptyState icon={Clock} title={tt("periods.empty")} />;
  } else if (!isLoading && (entries.data ?? []).length === 0) {
    body = <EmptyState icon={CalendarClock} title={t(emptyKey)} />;
  } else {
    body = (
      <TimetableGrid
        periods={periods.data ?? []}
        days={orderStudyDays(school?.studyDays ?? [])}
        entries={entries.data ?? []}
        detail={detail}
        isLoading={isLoading}
      />
    );
  }

  return (
    <>
      <PageHeader title={title} description={t(subtitleKey)} />
      {body}
    </>
  );
}
