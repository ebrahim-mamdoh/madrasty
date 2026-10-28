import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { StudentHomeworkDetailPageClient } from "@/components/pages/StudentHomeworkDetailPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("homework") };
}

export default async function StudentHomeworkDetailPage({
  params,
}: PageProps<"/[locale]/student/homework/[id]">) {
  await requireFeature("student", "homework");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <StudentHomeworkDetailPageClient id={id} />;
}
