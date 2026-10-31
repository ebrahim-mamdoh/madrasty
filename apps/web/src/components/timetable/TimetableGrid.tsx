"use client";

import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
 * The weekly timetable: one row per study day, one column per period. Used by the admin editor,
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
  const locale = useLocale();
  const isRtl = locale === "ar";
  const bySlot = new Map(entries.map((entry) => [`${entry.weekday}:${entry.periodId}`, entry]));

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th
              scope="col"
              className="w-32 p-3 text-start font-semibold text-muted-foreground bg-muted/40"
            >
              {t("day")}
            </th>
            {periods.map((period) => (
              <th
                key={period.id}
                scope="col"
                className="border-s p-2.5 text-center font-medium"
              >
                <span className="block font-semibold text-foreground">
                  {t("period_n", { n: period.number })}
                </span>
                <span
                  className="block text-xs text-muted-foreground tabular-nums font-normal"
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  {period.startsAt} – {period.endsAt}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day} className="border-t">
              <th
                scope="row"
                className="p-3 text-start align-middle font-bold text-foreground bg-muted/20 whitespace-nowrap"
              >
                {t(`weekdays.${day}` as "weekdays.0")}
              </th>
              {periods.map((period) => {
                const entry = bySlot.get(`${day}:${period.id}`);
                const label = `${t(`weekdays.${day}` as "weekdays.0")} — ${t("period_n", { n: period.number })}`;
                const content = isLoading ? (
                  <Skeleton className="h-12 w-full rounded-md" />
                ) : entry ? (
                  <div className="min-w-0 rounded-md border border-primary/20 bg-primary/5 p-2 text-start transition-colors hover:bg-primary/10">
                    <p className="truncate font-semibold text-primary">{entry.subject.name}</p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {detail === "class"
                        ? entry.class.name
                        : (entry.teacher?.fullName ?? t("no_teacher"))}
                    </p>
                  </div>
                ) : onSlotClick ? (
                  <span className="grid h-full min-h-12 place-items-center rounded-md border border-dashed border-border/80 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-primary">
                    <Plus aria-hidden className="size-4" />
                  </span>
                ) : null;

                return (
                  <td key={period.id} className="border-s p-1.5 align-middle">
                    {onSlotClick && !isLoading ? (
                      <button
                        type="button"
                        aria-label={
                          entry ? `${label}: ${entry.subject.name}` : `${label}: ${t("empty_slot")}`
                        }
                        onClick={() => onSlotClick(day, period, entry)}
                        className={cn(
                          "block w-full rounded-md outline-none transition-colors",
                          "hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/50",
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
