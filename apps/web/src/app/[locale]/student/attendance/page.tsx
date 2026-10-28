import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StudentAttendancePageClient } from "@/components/pages/StudentAttendancePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("attendance") };
}

/** The student layout already restricts this route to students. */
export default function StudentAttendancePage() {
  return <StudentAttendancePageClient />;
}
