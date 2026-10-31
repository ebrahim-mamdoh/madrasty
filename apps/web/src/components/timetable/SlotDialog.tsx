"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { Period, TimetableEntry } from "@madrasty/core";
import { AppDialogContent } from "@/components/shared/AppDialogContent";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useClassSubjectsWithTeachers,
  useClearSlot,
  useSetSlot,
} from "@/hooks/queries/timetable/useTimetable";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifySuccess } from "@/lib/utils";

export type SlotTarget = {
  weekday: number;
  period: Period;
  entry: TimetableEntry | undefined;
};

export type SlotDialogProps = {
  classId: string;
  target: SlotTarget | null;
  onOpenChange: (open: boolean) => void;
};

/** Picks which of the class's subjects fills one (day, period) slot, or empties it. */
export function SlotDialog({ classId, target, onOpenChange }: SlotDialogProps) {
  const t = useTranslations("timetable");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const subjects = useClassSubjectsWithTeachers(classId);
  const setSlot = useSetSlot();
  const clearSlot = useClearSlot();
  const [classSubjectId, setClassSubjectId] = useState(target?.entry?.classSubjectId ?? "");

  const isPending = setSlot.isPending || clearSlot.isPending;
  const error = setSlot.error ?? clearSlot.error;
  const slot = target && { classId, weekday: target.weekday, periodId: target.period.id };

  const close = () => {
    onOpenChange(false);
    setSlot.reset();
    clearSlot.reset();
  };

  const onSave = () => {
    if (!slot || !classSubjectId) return;
    setSlot.mutate(
      { slot, classSubjectId },
      {
        onSuccess: () => {
          notifySuccess(tc("saved"));
          close();
        },
      },
    );
  };

  const onClear = () => {
    if (!slot) return;
    clearSlot.mutate(slot, {
      onSuccess: () => {
        notifySuccess(t("slot_cleared"));
        close();
      },
    });
  };

  const options = subjects.data ?? [];

  const isRtl = useLocale() === "ar";
  return (
    <Dialog open={Boolean(target)} onOpenChange={(next) => !next && !isPending && close()}>
      <AppDialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target &&
              `${t(`weekdays.${target.weekday}` as "weekdays.0")} — ${t("period_n", { n: target.period.number })}`}
          </DialogTitle>
          <DialogDescription dir="auto">
            {target && (
              <span dir={isRtl ? "rtl" : "ltr"}>
                {target.period.startsAt} – {target.period.endsAt}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="slot-subject">{t("subject")}</FieldLabel>
          <Select value={classSubjectId} onValueChange={setClassSubjectId}>
            <SelectTrigger id="slot-subject" className="w-full">
              <SelectValue placeholder={t("choose_subject")} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.subjectName} — {option.teacherName ?? t("no_teacher")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!subjects.isLoading && options.length === 0 && (
            <FieldDescription>{t("no_class_subjects")}</FieldDescription>
          )}
          {error && <FieldError>{toMessage(error)}</FieldError>}
        </Field>

        <DialogFooter className="sm:justify-between">
          {target?.entry ? (
            <Button
              variant="ghost"
              className="text-destructive"
              disabled={isPending}
              onClick={onClear}
            >
              {clearSlot.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <Trash2 aria-hidden />}
              {t("clear_slot")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" disabled={isPending} onClick={close}>
              {tc("cancel")}
            </Button>
            <Button disabled={isPending || !classSubjectId} onClick={onSave}>
              {setSlot.isPending && <Loader2 aria-hidden className="animate-spin" />}
              {tc("save")}
            </Button>
          </div>
        </DialogFooter>
      </AppDialogContent>
    </Dialog>
  );
}
