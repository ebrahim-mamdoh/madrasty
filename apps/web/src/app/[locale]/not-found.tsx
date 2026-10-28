import { FileQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        icon={FileQuestion}
        title={t("errors.not_found")}
        action={
          <Button asChild variant="outline">
            <Link href="/">{t("nav.dashboard")}</Link>
          </Button>
        }
      />
    </div>
  );
}
