import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MonitoringPageClient } from "@/components/pages/MonitoringPageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("monitoring") };
}

export default async function MonitoringPage() {
  await requirePermission("monitoring.view");
  return <MonitoringPageClient />;
}
