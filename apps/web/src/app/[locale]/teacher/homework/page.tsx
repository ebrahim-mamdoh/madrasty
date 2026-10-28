import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeacherHomeworkPageClient } from "@/components/pages/TeacherHomeworkPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("homework") };
}

export default async function TeacherHomeworkPage() {
  await requireFeature("teacher", "homework");
  return <TeacherHomeworkPageClient />;
}
