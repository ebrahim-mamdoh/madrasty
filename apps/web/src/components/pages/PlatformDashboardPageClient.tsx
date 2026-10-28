"use client";

import { BadgeCheck, GraduationCap, School, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { usePlatformStats } from "@/hooks/queries/schools/useSchools";

export function PlatformDashboardPageClient() {
  const t = useTranslations("platform.dashboard");
  const format = useFormatter();
  const stats = usePlatformStats();
  const n = (value: number | undefined) => (value === undefined ? undefined : format.number(value));

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("schools_total")}
          value={n(stats.data?.schoolsTotal)}
          icon={School}
          isLoading={stats.isLoading}
        />
        <StatCard
          label={t("schools_active")}
          value={n(stats.data?.schoolsActive)}
          icon={BadgeCheck}
          isLoading={stats.isLoading}
        />
        <StatCard
          label={t("students_total")}
          value={n(stats.data?.studentsTotal)}
          icon={GraduationCap}
          isLoading={stats.isLoading}
        />
        <StatCard
          label={t("teachers_total")}
          value={n(stats.data?.teachersTotal)}
          icon={Users}
          isLoading={stats.isLoading}
        />
      </div>
    </>
  );
}
