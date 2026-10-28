import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RolesPageClient } from "@/components/pages/RolesPageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("roles") };
}

export default async function RolesPage() {
  await requirePermission("roles.manage");
  return <RolesPageClient />;
}
