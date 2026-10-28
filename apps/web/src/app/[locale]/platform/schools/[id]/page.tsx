import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { SchoolDetailPageClient } from "@/components/pages/SchoolDetailPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("school_detail") };
}

export default async function SchoolDetailPage({
  params,
}: PageProps<"/[locale]/platform/schools/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <SchoolDetailPageClient id={id} />;
}
