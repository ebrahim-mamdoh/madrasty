import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StructurePageClient } from "@/components/pages/StructurePageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("structure") };
}

export default async function StructurePage() {
  await requirePermission("structure.view");
  return <StructurePageClient />;
}
