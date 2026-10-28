import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeacherAttendancePageClient } from "@/components/pages/TeacherAttendancePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("attendance") };
}

/** The teacher layout already restricts this route to teachers. */
export default function TeacherAttendancePage() {
  return <TeacherAttendancePageClient />;
}
