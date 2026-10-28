import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ExamRoomPageClient } from "@/components/pages/ExamRoomPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("exam_room") };
}

export default async function ExamRoomPage({ params }: PageProps<"/[locale]/student/exams/[id]">) {
  await requireFeature("student", "online_exams");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <ExamRoomPageClient examId={id} />;
}
