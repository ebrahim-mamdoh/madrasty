import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentHomeworkPageClient } from "@/components/pages/StudentHomeworkPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("homework") };
}

export default async function StudentHomeworkPage() {
  await requireFeature("student", "homework");
  return <StudentHomeworkPageClient />;
}
