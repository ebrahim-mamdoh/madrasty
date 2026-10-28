import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminAttendancePageClient } from "@/components/pages/AdminAttendancePageClient";
import { requirePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("attendance") };
}

export default async function AdminAttendancePage() {
  await requirePermission("attendance.view");
  return <AdminAttendancePageClient />;
}
