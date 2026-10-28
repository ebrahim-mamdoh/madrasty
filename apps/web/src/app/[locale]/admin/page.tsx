import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PortalWelcome } from "@/components/shared/PortalWelcome";
import { requirePortal } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("admin") };
}

export default async function AdminHomePage() {
  const session = await requirePortal("admin");
  return <PortalWelcome session={session} subtitleKey="admin_subtitle" />;
}
