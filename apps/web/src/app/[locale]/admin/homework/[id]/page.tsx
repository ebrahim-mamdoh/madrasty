import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { HomeworkDetailPageClient } from "@/components/pages/HomeworkDetailPageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("homework") };
}

export default async function AdminHomeworkDetailPage({
  params,
}: PageProps<"/[locale]/admin/homework/[id]">) {
  const session = await requirePermission("homework.view", "homework");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return (
    <HomeworkDetailPageClient
      id={id}
      basePath="/admin/homework"
      canManage={session.permissions.includes("homework.manage")}
    />
  );
}
