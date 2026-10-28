"use client";

import { CalendarClock, Clock, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { orderStudyDays } from "@madrasty/core";
import { EmptyState } from "@/components/shared/EmptyState";
import { SlotDialog, type SlotTarget } from "@/components/timetable/SlotDialog";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYears, useClasses } from "@/hooks/queries/structure/useStructure";
import { useClassTimetable, usePeriods } from "@/hooks/queries/timetable/useTimetable";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { usePermission, useSession } from "@/hooks/useSession";
import { useUrlState } from "@/hooks/useUrlState";

/** Admin: pick a class of the current year and edit its weekly timetable cell by cell. */
export function ClassTimetablePanel() {
  const t = useTranslations("timetable");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const canManage = usePermission("structure.manage");
  const { school } = useSession();
  const { searchParams, setParams } = useUrlState();

  const years = useAcademicYears();
  const currentYearId = years.data?.find((year) => year.isCurrent)?.id;
  const classes = useClasses(currentYearId);
  const periods = usePeriods();

  const requested = searchParams.get("class");
  const classList = classes.data ?? [];
  const classId = classList.some((c) => c.id === requested) ? requested! : classList[0]?.id;
  const entries = useClassTimetable(classId);
  const [target, setTarget] = useState<SlotTarget | null>(null);

  const days = orderStudyDays(school?.studyDays ?? []);
  const error = years.error ?? classes.error ?? periods.error ?? entries.error;
  const isLoading = years.isLoading || classes.isLoading || periods.isLoading;

  if (error) {
    return (
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
  }
  if (!isLoading && !currentYearId) {
    return <EmptyState icon={Layers} title={t("no_current_year")} />;
  }
  if (!isLoading && classList.length === 0) {
    return <EmptyState icon={Layers} title={t("no_classes")} />;
  }
  if (!isLoading && (periods.data ?? []).length === 0) {
    return <EmptyState icon={Clock} title={t("periods.empty")} description={t("no_periods_hint")} />;
  }

  return (
    <div className="space-y-4">
      <Select value={classId ?? ""} onValueChange={(value) => setParams({ class: value })}>
        <SelectTrigger className="w-60" aria-label={t("class")}>
          <SelectValue placeholder={t("class")} />
        </SelectTrigger>
        <SelectContent>
          {classList.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name} — {c.gradeLevel.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <TimetableGrid
        periods={periods.data ?? []}
        days={days}
        entries={entries.data ?? []}
        detail="teacher"
        isLoading={isLoading || entries.isLoading}
        onSlotClick={
          canManage && classId
            ? (weekday, period, entry) => setTarget({ weekday, period, entry })
            : undefined
        }
      />
      {canManage && <p className="text-sm text-muted-foreground">{t("edit_hint")}</p>}

      {classId && (
        <SlotDialog
          key={target ? `${target.weekday}:${target.period.id}` : "none"}
          classId={classId}
          target={target}
          onOpenChange={(open) => !open && setTarget(null)}
        />
      )}
    </div>
  );
}
