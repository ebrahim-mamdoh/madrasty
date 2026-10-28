import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminDashboardPageClient } from "@/components/pages/AdminDashboardPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("admin") };
}

/** The portal layout already checks the role. */
export default function AdminHomePage() {
  return <AdminDashboardPageClient />;
}
