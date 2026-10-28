import type { AttendanceStatus } from "@madrasty/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** One colour per status, shared by the sheet, reports and the student's history. */
export const STATUS_TONES: Record<AttendanceStatus, string> = {
  present: "border-success/30 bg-success/10 text-success",
  absent: "border-destructive/30 bg-destructive/10 text-destructive",
  late: "border-warning/30 bg-warning/10 text-warning",
  excused: "border-border bg-muted text-muted-foreground",
};

export function AttendanceStatusBadge({
  status,
  label,
  className,
}: {
  status: AttendanceStatus;
  label: string;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5", STATUS_TONES[status], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
