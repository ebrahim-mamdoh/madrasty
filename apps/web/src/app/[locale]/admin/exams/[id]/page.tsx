import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { PermissionKey } from "@madrasty/core";
import { z } from "zod";
import { ExamDetailPageClient } from "@/components/pages/ExamDetailPageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("exams") };
}

export default async function AdminExamDetailPage({ params }: PageProps<"/[locale]/admin/exams/[id]">) {
  const session = await requirePermission("exams.view", "exams");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const can = (key: PermissionKey) => session.permissions.includes(key);
  return (
    <ExamDetailPageClient
      id={id}
      basePath="/admin/exams"
      canManage={can("exams.manage")}
      canApprove={can("exams.approve")}
      canEditGrades={can("grades.edit")}
    />
  );
}
