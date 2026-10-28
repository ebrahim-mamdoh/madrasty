"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { BankQuestion } from "@madrasty/core";
import { AppDialogContent } from "@/components/shared/AppDialogContent";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuestionBank } from "@/hooks/queries/exams/useExams";

export type BankImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  isPending: boolean;
  onImport: (questions: BankQuestion[]) => void;
};

/** Pick questions from the subject's bank; they are copied into the exam. */
export function BankImportDialog({ open, onOpenChange, subjectId, isPending, onImport }: BankImportDialogProps) {
  const t = useTranslations("exams.questions");
  const tc = useTranslations("common");
  const bank = useQuestionBank(open ? subjectId : undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const rows = bank.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AppDialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("import_title")}</DialogTitle>
          <DialogDescription>{t("import_hint")}</DialogDescription>
        </DialogHeader>
        {bank.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("bank_empty")}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((question) => (
              <li key={question.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5">
                  <Checkbox
                    checked={selected.includes(question.id)}
                    onCheckedChange={(checked) =>
                      setSelected((current) =>
                        checked === true
                          ? [...current, question.id]
                          : current.filter((id) => id !== question.id),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">
                      {t(`types.${question.type}`)}
                    </span>
                    <span className="line-clamp-2 text-sm" dir="auto">
                      {question.text}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            disabled={isPending || selected.length === 0}
            onClick={() => onImport(rows.filter((q) => selected.includes(q.id)))}
          >
            {isPending && <Loader2 aria-hidden className="animate-spin" />}
            {t("import_n", { n: selected.length })}
          </Button>
        </DialogFooter>
      </AppDialogContent>
    </Dialog>
  );
}
