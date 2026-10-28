"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** id of the <form> inside `children`; the footer submit button targets it. */
  formId: string;
  submitLabel?: string;
  isPending?: boolean;
  className?: string;
  children: ReactNode;
};

/** Dialog frame shared by every create/edit form: header, scrollable body, cancel/submit footer. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  formId,
  submitLabel,
  isPending,
  className,
  children,
}: FormDialogProps) {
  const t = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className={cn("max-h-[90dvh] overflow-y-auto sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending && <Loader2 aria-hidden className="animate-spin" />}
            {submitLabel ?? t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
