import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlatformFinancePageClient } from "@/components/pages/PlatformFinancePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("finance") };
}

/** The platform layout already restricts this route to the platform owner. */
export default function PlatformFinancePage() {
  return <PlatformFinancePageClient />;
}
