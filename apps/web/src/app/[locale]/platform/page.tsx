import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlatformDashboardPageClient } from "@/components/pages/PlatformDashboardPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("platform") };
}

export default function PlatformDashboardPage() {
  return <PlatformDashboardPageClient />;
}
