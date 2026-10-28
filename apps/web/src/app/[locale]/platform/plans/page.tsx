import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlansPageClient } from "@/components/pages/PlansPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("plans") };
}

/** The platform layout already restricts this route to the platform owner. */
export default function PlansPage() {
  return <PlansPageClient />;
}
