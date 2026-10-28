"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { WEEKDAYS } from "@madrasty/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useSetStudyDays } from "@/hooks/queries/timetable/useTimetable";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifyError, notifySuccess } from "@/lib/utils";

export type StudyDaysCardProps = {
  days: number[];
  canManage: boolean;
};

/** Which weekdays the school teaches on; they become the timetable's columns everywhere. */
export function StudyDaysCard({ days, canManage }: StudyDaysCardProps) {
  const t = useTranslations("timetable");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSetStudyDays();
  const [selected, setSelected] = useState<number[]>(days);

  const isDirty = selected.length !== days.length || selected.some((d) => !days.includes(d));

  const onSave = () =>
    save.mutate(selected, {
      onSuccess: () => notifySuccess(t("study_days_saved")),
      onError: (error) => notifyError(toMessage(error)),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("study_days")}</CardTitle>
        <CardDescription>{t("study_days_hint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div role="group" aria-label={t("study_days")} className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <label
              key={day}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 has-disabled:cursor-default"
            >
              <Checkbox
                checked={selected.includes(day)}
                disabled={!canManage}
                onCheckedChange={(checked) =>
                  setSelected((current) =>
                    checked === true ? [...current, day] : current.filter((d) => d !== day),
                  )
                }
              />
              {t(`weekdays.${day}`)}
            </label>
          ))}
        </div>
        {canManage && (
          <Button onClick={onSave} disabled={save.isPending || !isDirty || selected.length === 0}>
            {save.isPending && <Loader2 aria-hidden className="animate-spin" />}
            {tc("save")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
