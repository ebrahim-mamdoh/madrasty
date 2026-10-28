"use client";

import { useTranslations } from "next-intl";
import { AccessPanel } from "@/components/roles/AccessPanel";
import { RolesPanel } from "@/components/roles/RolesPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlState } from "@/hooks/useUrlState";

const TABS = ["roles", "people"] as const;
type AccessTab = (typeof TABS)[number];

function isTab(value: string | null): value is AccessTab {
  return (TABS as readonly (string | null)[]).includes(value);
}

export function RolesPageClient() {
  const t = useTranslations("access");
  const { searchParams, setParams } = useUrlState();
  const requested = searchParams.get("tab");
  const tab: AccessTab = isTab(requested) ? requested : "roles";

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
        <TabsList className="mb-4 h-auto flex-wrap">
          {TABS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="roles">{tab === "roles" && <RolesPanel />}</TabsContent>
        <TabsContent value="people">{tab === "people" && <AccessPanel />}</TabsContent>
      </Tabs>
    </>
  );
}
