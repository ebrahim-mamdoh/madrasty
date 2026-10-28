"use client";

import { DoorOpen, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyClasses } from "@/hooks/queries/teaching/useTeaching";
import { useErrorMessage } from "@/hooks/useErrorMessage";

export function TeacherClassesPageClient() {
  const t = useTranslations("teacher.classes");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const classes = useMyClasses();

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      {classes.isError ? (
        <EmptyState
          icon={DoorOpen}
          title={toMessage(classes.error)}
          action={
            <Button variant="outline" onClick={() => void classes.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : classes.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : classes.data?.length === 0 ? (
        <EmptyState icon={DoorOpen} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.data?.map((schoolClass) => (
            <Card key={schoolClass.id} className="gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-lg font-bold">{schoolClass.name}</p>
                  <p className="text-sm text-muted-foreground">{schoolClass.gradeLevelName}</p>
                </div>
                {schoolClass.isHomeroom && (
                  <Badge className="bg-primary/10 text-primary">{t("homeroom")}</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {schoolClass.subjects.length > 0 ? (
                  schoolClass.subjects.map((subject) => (
                    <Badge key={subject} variant="outline">
                      {subject}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">{t("homeroom_only")}</span>
                )}
              </div>

              <p className="mt-auto flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users aria-hidden className="size-4" />
                {t("students", { count: schoolClass.studentsCount })}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
