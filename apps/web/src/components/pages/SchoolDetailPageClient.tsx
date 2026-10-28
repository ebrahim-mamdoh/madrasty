"use client";

import { ArrowRight, PauseCircle, PlayCircle, School } from "lucide-react";
import { useTranslations } from "next-intl";
import { SubscriptionCard } from "@/components/finance/SubscriptionCard";
import { SchoolAdminsCard } from "@/components/schools/SchoolAdminsCard";
import { SchoolFeaturesCard } from "@/components/schools/SchoolFeaturesCard";
import { SchoolInfoCard } from "@/components/schools/SchoolInfoCard";
import { SchoolStatusBadge } from "@/components/schools/SchoolStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchool, useSetSchoolStatus } from "@/hooks/queries/schools/useSchools";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { Link } from "@/i18n/navigation";
import { notifyError, notifySuccess } from "@/lib/utils";

export function SchoolDetailPageClient({ id }: { id: string }) {
  const t = useTranslations("platform.school");
  const ts = useTranslations("platform.schools");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const school = useSchool(id);
  const setStatus = useSetSchoolStatus();

  const back = (
    <Button variant="ghost" size="sm" className="mb-2 -ms-2" asChild>
      <Link href="/platform/schools">
        <ArrowRight aria-hidden className="ltr:rotate-180" />
        {t("back")}
      </Link>
    </Button>
  );

  if (school.isLoading) {
    return (
      <>
        {back}
        <Skeleton className="mb-6 h-9 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }

  if (school.isError || !school.data) {
    return (
      <>
        {back}
        <EmptyState
          icon={School}
          title={toMessage(school.error)}
          action={
            <Button variant="outline" onClick={() => void school.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      </>
    );
  }

  const data = school.data;
  const isActive = data.status === "active";
  const toggleStatus = () =>
    setStatus.mutate(
      { id, status: isActive ? "suspended" : "active" },
      {
        onSuccess: () => notifySuccess(ts("status_updated")),
        onError: (error) => notifyError(toMessage(error)),
      },
    );

  return (
    <>
      {back}
      <PageHeader
        title={data.name}
        description={t("subtitle")}
        actions={
          <>
            <SchoolStatusBadge status={data.status} />
            <Button
              variant={isActive ? "outline" : "default"}
              disabled={setStatus.isPending}
              onClick={toggleStatus}
            >
              {isActive ? <PauseCircle aria-hidden /> : <PlayCircle aria-hidden />}
              {isActive ? ts("suspend") : ts("activate")}
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Keyed by the saved values so the forms re-seed after another tab/user changes them. */}
        <SchoolInfoCard key={data.name} school={data} />
        <SchoolFeaturesCard key={data.features.join()} schoolId={id} features={data.features} />
        <SchoolAdminsCard schoolId={id} />
        <SubscriptionCard schoolId={id} />
      </div>
    </>
  );
}
