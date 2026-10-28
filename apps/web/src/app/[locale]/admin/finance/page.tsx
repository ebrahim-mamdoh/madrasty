import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminFinancePageClient } from "@/components/pages/AdminFinancePageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("finance") };
}

export default async function AdminFinancePage() {
  await requirePermission("finance.view");
  return <AdminFinancePageClient />;
}
