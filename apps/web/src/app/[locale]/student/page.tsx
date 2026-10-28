import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentDashboardPageClient } from "@/components/pages/StudentDashboardPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("student") };
}

/** The portal layout already checks the role. */
export default function StudentHomePage() {
  return <StudentDashboardPageClient />;
}
