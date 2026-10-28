import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PeoplePageClient } from "@/components/pages/PeoplePageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("staff") };
}

export default async function StaffPage() {
  await requirePermission("staff.view");
  return <PeoplePageClient role="staff" />;
}
