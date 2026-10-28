"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations();
  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-4">
      <EmptyState
        icon={TriangleAlert}
        title={t("errors.unknown")}
        action={
          <Button variant="outline" onClick={reset}>
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}
