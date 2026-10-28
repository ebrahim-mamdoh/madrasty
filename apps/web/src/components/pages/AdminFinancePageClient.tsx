"use client";

import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { BalancesPanel } from "@/components/finance/BalancesPanel";
import { FeeItemsPanel } from "@/components/finance/FeeItemsPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAcademicYears } from "@/hooks/queries/structure/useStructure";
import { useUrlState } from "@/hooks/useUrlState";

/** Admin → Finance for the current academic year: fees, then each student's balance and payments. */
export function AdminFinancePageClient() {
  const t = useTranslations("finance");
  const { searchParams, setParams } = useUrlState();
  const tab = searchParams.get("tab") === "fees" ? "fees" : "balances";
  const years = useAcademicYears();
  const yearId = years.data?.find((y) => y.isCurrent)?.id;

  return (
    <>
      <PageHeader title={t("title")} description={t("admin_subtitle")} />
      {years.isLoading ? (
        <Skeleton className="h-48" />
      ) : !yearId ? (
        <EmptyState icon={Layers} title={t("no_year")} />
      ) : (
        <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
          <TabsList className="mb-4">
            <TabsTrigger value="balances">{t("tabs.balances")}</TabsTrigger>
            <TabsTrigger value="fees">{t("tabs.fees")}</TabsTrigger>
          </TabsList>
          <TabsContent value="balances">{tab === "balances" && <BalancesPanel yearId={yearId} />}</TabsContent>
          <TabsContent value="fees">{tab === "fees" && <FeeItemsPanel yearId={yearId} />}</TabsContent>
        </Tabs>
      )}
    </>
  );
}
