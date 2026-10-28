import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeacherDashboardPageClient } from "@/components/pages/TeacherDashboardPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("teacher") };
}

/** The portal layout already checks the role. */
export default function TeacherHomePage() {
  return <TeacherDashboardPageClient />;
}
