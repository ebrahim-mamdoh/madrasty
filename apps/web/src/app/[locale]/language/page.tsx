import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LanguagePageClient } from "@/components/pages/LanguagePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("language");
  return { title: t("page_title") };
}

export default async function LanguagePage() {
  return <LanguagePageClient />;
}
