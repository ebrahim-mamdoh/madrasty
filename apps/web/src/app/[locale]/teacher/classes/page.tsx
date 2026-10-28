import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeacherClassesPageClient } from "@/components/pages/TeacherClassesPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("my_classes") };
}

/** The teacher layout already restricts this route to teachers. */
export default function TeacherClassesPage() {
  return <TeacherClassesPageClient />;
}
