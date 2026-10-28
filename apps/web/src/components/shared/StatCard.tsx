import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  label: string;
  value?: number | string;
  icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
};

export function StatCard({ label, value, icon: Icon, isLoading, className }: StatCardProps) {
  return (
    <Card className={cn("flex-row items-center gap-4 p-5", className)}>
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon aria-hidden className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        {isLoading ? (
          <Skeleton className="mt-1 h-7 w-16" />
        ) : (
          <p className="text-2xl font-bold tabular-nums">{value ?? "—"}</p>
        )}
      </div>
    </Card>
  );
}
