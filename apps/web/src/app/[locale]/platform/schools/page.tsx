import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SchoolsPageClient } from "@/components/pages/SchoolsPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("schools") };
}

export default function SchoolsPage() {
  return <SchoolsPageClient />;
}
