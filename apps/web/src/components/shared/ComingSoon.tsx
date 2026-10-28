import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/EmptyState";

/** Placeholder for portal sections that are on the roadmap but not built yet. */
export async function ComingSoon() {
  const t = await getTranslations("dashboard");
  return <EmptyState icon={Construction} title={t("coming_soon")} className="mt-6" />;
}
