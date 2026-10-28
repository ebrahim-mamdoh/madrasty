import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PortalWelcome } from "@/components/shared/PortalWelcome";
import { requirePortal } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("teacher") };
}

export default async function TeacherHomePage() {
  const session = await requirePortal("teacher");
  return <PortalWelcome session={session} subtitleKey="teacher_subtitle" />;
}
