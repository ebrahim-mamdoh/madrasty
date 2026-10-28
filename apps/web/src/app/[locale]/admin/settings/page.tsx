import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SettingsPageClient } from "@/components/pages/SettingsPageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("settings") };
}

export default async function SettingsPage() {
  await requirePermission("settings.branding");
  return <SettingsPageClient />;
}
