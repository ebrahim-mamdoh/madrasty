import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MySubjectsPageClient } from "@/components/pages/MySubjectsPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("my_subjects") };
}

/** The student layout already restricts this route to students. */
export default function StudentSubjectsPage() {
  return <MySubjectsPageClient />;
}
