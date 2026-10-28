"use client";

import { useTranslations } from "next-intl";
import type { HomeworkStatus } from "@madrasty/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES: Record<HomeworkStatus, string> = {
  pending: "border-border bg-muted text-muted-foreground",
  late: "border-destructive/30 bg-destructive/10 text-destructive",
  submitted: "border-warning/30 bg-warning/10 text-warning",
  graded: "border-success/30 bg-success/10 text-success",
};

export function HomeworkStatusBadge({ status, className }: { status: HomeworkStatus; className?: string }) {
  const t = useTranslations("homework.status");
  return (
    <Badge variant="outline" className={cn("gap-1.5", TONES[status], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </Badge>
  );
}
