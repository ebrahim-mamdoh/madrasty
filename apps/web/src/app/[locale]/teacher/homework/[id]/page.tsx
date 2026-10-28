import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { HomeworkDetailPageClient } from "@/components/pages/HomeworkDetailPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("homework") };
}

/** Teachers only see homework of their own subjects (RLS), so they manage what they can open. */
export default async function TeacherHomeworkDetailPage({
  params,
}: PageProps<"/[locale]/teacher/homework/[id]">) {
  await requireFeature("teacher", "homework");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <HomeworkDetailPageClient id={id} basePath="/teacher/homework" canManage />;
}
