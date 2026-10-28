"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TablePaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function TablePagination({
  page,
  pageCount,
  onPageChange,
  className,
}: TablePaginationProps) {
  const t = useTranslations("common");
  if (pageCount <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between gap-2 pt-4", className)}>
      <p className="text-sm text-muted-foreground">{t("page_of", { page, pageCount })}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight aria-hidden className="ltr:rotate-180" />
          {t("previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {t("next")}
          <ChevronLeft aria-hidden className="ltr:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
