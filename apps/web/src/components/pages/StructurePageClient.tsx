"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import { AcademicYearsPanel } from "@/components/structure/AcademicYearsPanel";
import { ClassesPanel } from "@/components/structure/ClassesPanel";
import { GradeLevelsPanel } from "@/components/structure/GradeLevelsPanel";
import { SubjectsPanel } from "@/components/structure/SubjectsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlState } from "@/hooks/useUrlState";

const TABS = ["years", "grades", "subjects", "classes"] as const;
type StructureTab = (typeof TABS)[number];

function isTab(value: string | null): value is StructureTab {
  return (TABS as readonly (string | null)[]).includes(value);
}

export function StructurePageClient() {
  const t = useTranslations("structure");
  const { searchParams, setParams } = useUrlState();
  const requested = searchParams.get("tab");
  const tab: StructureTab = isTab(requested) ? requested : "years";

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value, year: null })}>
        <TabsList className="mb-4 h-auto flex-wrap">
          {TABS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* Only the active panel mounts, so each tab fetches its data on demand. */}
        <TabsContent value="years">{tab === "years" && <AcademicYearsPanel />}</TabsContent>
        <TabsContent value="grades">{tab === "grades" && <GradeLevelsPanel />}</TabsContent>
        <TabsContent value="subjects">{tab === "subjects" && <SubjectsPanel />}</TabsContent>
        <TabsContent value="classes">{tab === "classes" && <ClassesPanel />}</TabsContent>
      </Tabs>
    </>
  );
}
