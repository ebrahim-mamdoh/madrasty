import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeacherExamsPageClient } from "@/components/pages/TeacherExamsPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("exams") };
}

export default async function TeacherExamsPage() {
  await requireFeature("teacher", "exams");
  return <TeacherExamsPageClient />;
}
