import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TimetablePageClient } from "@/components/pages/TimetablePageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("timetable") };
}

export default async function TimetablePage() {
  await requirePermission("structure.view");
  return <TimetablePageClient />;
}
