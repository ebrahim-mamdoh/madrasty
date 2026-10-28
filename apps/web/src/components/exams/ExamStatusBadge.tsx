"use client";

import { useTranslations } from "next-intl";
import type { ExamStatus } from "@madrasty/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES: Record<ExamStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  pending: "border-warning/30 bg-warning/10 text-warning",
  approved: "border-primary/30 bg-primary/10 text-primary",
  published: "border-success/30 bg-success/10 text-success",
};

export function ExamStatusBadge({ status, className }: { status: ExamStatus; className?: string }) {
  const t = useTranslations("exams.status");
  return (
    <Badge variant="outline" className={cn("gap-1.5", TONES[status], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </Badge>
  );
}
