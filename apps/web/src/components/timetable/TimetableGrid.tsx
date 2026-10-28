"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Period, TimetableEntry } from "@madrasty/core";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type TimetableGridProps = {
  periods: Period[];
  /** Weekdays to show as columns, in school order (0 = Sunday … 6 = Saturday). */
  days: number[];
  entries: TimetableEntry[];
  /** What the second line of a filled cell shows. */
  detail: "teacher" | "class";
  /** Makes every cell a button (admin editing). */
  onSlotClick?: (weekday: number, period: Period, entry: TimetableEntry | undefined) => void;
  isLoading?: boolean;
};

/**
 * The weekly timetable: one row per period, one column per study day. Used by the admin editor,
 * the teacher's week and the student's week. Scrolls horizontally inside its card on small screens.
 */
export function TimetableGrid({
  periods,
  days,
  entries,
  detail,
  onSlotClick,
  isLoading,
}: TimetableGridProps) {
  const t = useTranslations("timetable");
  const bySlot = new Map(entries.map((entry) => [`${entry.weekday}:${entry.periodId}`, entry]));

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th scope="col" className="w-28 p-3 text-start font-medium text-muted-foreground">
              {t("period")}
            </th>
            {days.map((day) => (
              <th key={day} scope="col" className="p-3 text-start font-medium">
                {t(`weekdays.${day}` as "weekdays.0")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.id} className="border-t">
              <th scope="row" className="p-3 text-start align-top font-normal">
                <span className="block font-medium">{t("period_n", { n: period.number })}</span>
                <span className="block text-xs text-muted-foreground tabular-nums" dir="ltr">
                  {period.startsAt} – {period.endsAt}
                </span>
              </th>
              {days.map((day) => {
                const entry = bySlot.get(`${day}:${period.id}`);
                const label = `${t(`weekdays.${day}` as "weekdays.0")} — ${t("period_n", { n: period.number })}`;
                const content = isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : entry ? (
                  <div className="min-w-0 rounded-md bg-primary/10 px-2 py-1.5 text-start">
                    <p className="truncate font-medium text-foreground">{entry.subject.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {detail === "class"
                        ? entry.class.name
                        : (entry.teacher?.fullName ?? t("no_teacher"))}
                    </p>
                  </div>
                ) : onSlotClick ? (
                  <span className="grid h-full min-h-11 place-items-center rounded-md border border-dashed text-muted-foreground">
                    <Plus aria-hidden className="size-4" />
                  </span>
                ) : null;

                return (
                  <td key={day} className="border-s p-1.5 align-top">
                    {onSlotClick && !isLoading ? (
                      <button
                        type="button"
                        aria-label={
                          entry ? `${label}: ${entry.subject.name}` : `${label}: ${t("empty_slot")}`
                        }
                        onClick={() => onSlotClick(day, period, entry)}
                        className={cn(
                          "block w-full rounded-md outline-none transition-colors",
                          "hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        )}
                      >
                        {content}
                      </button>
                    ) : (
                      content
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
