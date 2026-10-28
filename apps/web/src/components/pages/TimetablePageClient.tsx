"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import { ClassTimetablePanel } from "@/components/timetable/ClassTimetablePanel";
import { PeriodsPanel } from "@/components/timetable/PeriodsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlState } from "@/hooks/useUrlState";

const TABS = ["timetable", "periods"] as const;
type TimetableTab = (typeof TABS)[number];

function isTab(value: string | null): value is TimetableTab {
  return (TABS as readonly (string | null)[]).includes(value);
}

export function TimetablePageClient() {
  const t = useTranslations("timetable");
  const { searchParams, setParams } = useUrlState();
  const requested = searchParams.get("tab");
  const tab: TimetableTab = isTab(requested) ? requested : "timetable";

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
        <TabsContent value="timetable">{tab === "timetable" && <ClassTimetablePanel />}</TabsContent>
        <TabsContent value="periods">{tab === "periods" && <PeriodsPanel />}</TabsContent>
      </Tabs>
    </>
  );
}
