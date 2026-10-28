import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentExamsPageClient } from "@/components/pages/StudentExamsPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("exams") };
}

export default async function StudentExamsPage() {
  await requireFeature("student", "exams");
  return <StudentExamsPageClient />;
}
