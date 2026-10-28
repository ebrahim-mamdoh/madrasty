import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReportsPageClient } from "@/components/pages/ReportsPageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("reports") };
}

export default async function AdminReportsPage() {
  await requirePermission("reports.view", "monthly_reports");
  return <ReportsPageClient viewer="admin" />;
}
