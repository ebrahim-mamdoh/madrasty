import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentGradesPageClient } from "@/components/pages/StudentGradesPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("my_grades") };
}

export default async function StudentGradesPage() {
  await requireFeature("student", "exams");
  return <StudentGradesPageClient />;
}
