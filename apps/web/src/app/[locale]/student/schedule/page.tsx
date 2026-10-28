import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MySchedulePageClient } from "@/components/pages/MySchedulePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("schedule") };
}

/** The student layout already restricts this route to students. */
export default function StudentSchedulePage() {
  return <MySchedulePageClient viewer="student" />;
}
