import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminHomeworkPageClient } from "@/components/pages/AdminHomeworkPageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("homework") };
}

export default async function AdminHomeworkPage() {
  await requirePermission("homework.view", "homework");
  return <AdminHomeworkPageClient />;
}
