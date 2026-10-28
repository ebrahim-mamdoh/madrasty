import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusBadgeProps = {
  label: string;
  tone: "success" | "warning" | "muted";
  className?: string;
};

const TONES: Record<StatusBadgeProps["tone"], string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  muted: "border-border bg-muted text-muted-foreground",
};

/** Dot + label pill for record states (active, suspended…). */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("gap-1.5", TONES[tone], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
