import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MySchedulePageClient } from "@/components/pages/MySchedulePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("schedule") };
}

/** The teacher layout already restricts this route to teachers. */
export default function TeacherSchedulePage() {
  return <MySchedulePageClient viewer="teacher" />;
}
