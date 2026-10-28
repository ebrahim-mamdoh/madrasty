"use client";

import { School, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@madrasty/core";
import { CreateSchoolDialog } from "@/components/schools/CreateSchoolDialog";
import { SchoolsTable } from "@/components/schools/SchoolsTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TablePagination } from "@/components/shared/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSchools, useSetSchoolStatus } from "@/hooks/queries/schools/useSchools";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useUrlState } from "@/hooks/useUrlState";
import { notifyError, notifySuccess } from "@/lib/utils";

export function SchoolsPageClient() {
  const t = useTranslations("platform.schools");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const { searchParams, setParams } = useUrlState();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const urlSearch = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (debouncedSearch !== urlSearch) setParams({ q: debouncedSearch, page: null });
  }, [debouncedSearch, urlSearch, setParams]);

  const schools = useSchools({ page, pageSize: DEFAULT_PAGE_SIZE, search: urlSearch });
  const setStatus = useSetSchoolStatus();

  const onStatusChange = (id: string, status: "active" | "suspended") =>
    setStatus.mutate(
      { id, status },
      {
        onSuccess: () => notifySuccess(t("status_updated")),
        onError: (error) => notifyError(toMessage(error)),
      },
    );

  const items = schools.data?.items ?? [];
  const isEmpty = !schools.isLoading && !schools.isError && items.length === 0;

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<CreateSchoolDialog />} />

      <div className="relative mb-4 max-w-sm">
        <Search
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search_placeholder")}
          aria-label={tc("search")}
          className="ps-9"
        />
      </div>

      {schools.isError ? (
        <EmptyState
          icon={School}
          title={toMessage(schools.error)}
          action={
            <Button variant="outline" onClick={() => void schools.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : isEmpty ? (
        <EmptyState icon={School} title={urlSearch ? t("empty_search") : t("empty")} />
      ) : (
        <>
          <SchoolsTable
            schools={items}
            isLoading={schools.isLoading}
            onStatusChange={onStatusChange}
          />
          <TablePagination
            page={page}
            pageCount={schools.data?.pageCount ?? 1}
            onPageChange={(next) => setParams({ page: next })}
          />
        </>
      )}
    </>
  );
}
