import { useTranslations } from "next-intl";
import type { SchoolStatus } from "@madrasty/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SchoolStatusBadgeProps = {
  status: SchoolStatus;
  className?: string;
};

export function SchoolStatusBadge({ status, className }: SchoolStatusBadgeProps) {
  const t = useTranslations("status");

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        status === "active"
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </Badge>
  );
}
