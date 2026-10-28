import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminExamsPageClient } from "@/components/pages/AdminExamsPageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("exams") };
}

export default async function AdminExamsPage() {
  await requirePermission("exams.view", "exams");
  return <AdminExamsPageClient />;
}
