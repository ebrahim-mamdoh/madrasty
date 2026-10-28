import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ExamDetailPageClient } from "@/components/pages/ExamDetailPageClient";
import { requireFeature } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("exams") };
}

/** Teachers only see exams of their own subjects (RLS), so they manage what they can open. */
export default async function TeacherExamDetailPage({ params }: PageProps<"/[locale]/teacher/exams/[id]">) {
  const session = await requireFeature("teacher", "exams");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return (
    <ExamDetailPageClient
      id={id}
      basePath="/teacher/exams"
      canManage
      canApprove={session.permissions.includes("exams.approve")}
      canEditGrades={session.permissions.includes("grades.edit")}
    />
  );
}
