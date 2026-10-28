import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GradebookPageClient } from "@/components/pages/GradebookPageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("grades") };
}

export default async function AdminGradesPage() {
  await requirePermission("grades.view", "exams");
  return <GradebookPageClient viewer="admin" />;
}
