import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GradebookPageClient } from "@/components/pages/GradebookPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("grades") };
}

export default async function TeacherGradesPage() {
  await requireFeature("teacher", "exams");
  return <GradebookPageClient viewer="teacher" />;
}
