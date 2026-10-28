"use client";

import { BadgeCheck, CalendarClock, GraduationCap, School, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { usePlatformFinance } from "@/hooks/queries/finance/useFinance";
import { usePlatformStats } from "@/hooks/queries/schools/useSchools";

export function PlatformDashboardPageClient() {
  const t = useTranslations("platform.dashboard");
  const format = useFormatter();
  const stats = usePlatformStats();
  const money = usePlatformFinance();
  const amount = (value: number | undefined) =>
    value === undefined ? undefined : format.number(value, { maximumFractionDigits: 2 });
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
      <h2 className="mt-8 mb-4 text-lg font-semibold">{t("this_month")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("income")}
          value={amount(money.data?.income)}
          icon={TrendingUp}
          isLoading={money.isLoading}
        />
        <StatCard
          label={t("commission")}
          value={amount(money.data?.commission)}
          icon={BadgeCheck}
          isLoading={money.isLoading}
        />
        <StatCard
          label={t("expense")}
          value={amount(money.data?.expense)}
          icon={TrendingDown}
          isLoading={money.isLoading}
        />
        <StatCard
          label={t("expiring")}
          value={n(money.data?.expiring)}
          icon={CalendarClock}
          isLoading={money.isLoading}
        />
      </div>
    </>
  );
}
