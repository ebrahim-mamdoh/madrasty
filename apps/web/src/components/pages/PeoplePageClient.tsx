"use client";

import { KeyRound, Pencil, Plus, Power, PowerOff, Search, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  DEFAULT_PAGE_SIZE,
  PERSON_MANAGE_PERMISSION,
  type ManagedPersonRole,
  type PersonListItem,
} from "@madrasty/core";
import { PersonFormDialog, ROLE_NAMESPACE } from "@/components/people/PersonFormDialog";
import { ResetPasswordDialog } from "@/components/people/ResetPasswordDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TablePagination } from "@/components/shared/TablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePeople,
  useResetPassword,
  useSetPersonActive,
} from "@/hooks/queries/people/usePeople";
import { useAcademicYears, useClasses } from "@/hooks/queries/structure/useStructure";
import { useCrudDialogs } from "@/hooks/useCrudDialogs";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { usePermission } from "@/hooks/useSession";
import { useUrlState } from "@/hooks/useUrlState";
import { notifyError, notifySuccess } from "@/lib/utils";

const ALL_CLASSES = "__all__";

export type PeoplePageClientProps = {
  role: ManagedPersonRole;
};

/** Teachers, students and parents share one screen; role-specific columns and fields switch on `role`. */
export function PeoplePageClient({ role }: PeoplePageClientProps) {
  const t = useTranslations("people");
  const tr = useTranslations(`people.${ROLE_NAMESPACE[role]}`);
  const tTeachers = useTranslations("people.teachers");
  const tStudents = useTranslations("people.students");
  const tParents = useTranslations("people.parents");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const canManage = usePermission(PERSON_MANAGE_PERMISSION[role]);
  const { searchParams, setParams } = useUrlState();

  // Students are shown with (and filtered by) their class in the current academic year.
  const years = useAcademicYears();
  const currentYearId = years.data?.find((year) => year.isCurrent)?.id;
  const classes = useClasses(role === "student" || role === "parent" ? currentYearId : undefined);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const urlSearch = searchParams.get("q") ?? "";
  const classId = searchParams.get("class") ?? undefined;
  const [search, setSearch] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (debouncedSearch !== urlSearch) setParams({ q: debouncedSearch, page: null });
  }, [debouncedSearch, urlSearch, setParams]);

  const list = usePeople(role, {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    search: urlSearch,
    academicYearId: role === "student" ? currentYearId : undefined,
    classId: role === "student" ? classId : undefined,
  });

  const setActive = useSetPersonActive();
  const resetPassword = useResetPassword();
  const dialogs = useCrudDialogs<PersonListItem>();
  const [resetting, setResetting] = useState<PersonListItem | null>(null);

  const toggleActive = (person: PersonListItem, active: boolean) =>
    setActive.mutate(
      { id: person.id, active },
      {
        onSuccess: () => notifySuccess(active ? t("activated") : t("deactivated")),
        onError: (error) => notifyError(toMessage(error)),
        onSettled: dialogs.closeDelete,
      },
    );

  const columns: EntityColumn<PersonListItem>[] = [
    {
      key: "name",
      header: t("fields.full_name"),
      cell: (person) => (
        <span className="font-semibold text-foreground">{person.fullName}</span>
      ),
    },
    {
      key: "email",
      header: t("fields.email"),
      cell: (person) => (
        <span dir="ltr" className="font-mono text-xs text-muted-foreground">
          {person.email}
        </span>
      ),
    },
    {
      key: "phone",
      header: t("fields.phone"),
      cell: (person) => (
        <span dir="ltr" className="text-sm text-muted-foreground font-mono">
          {person.phone ?? "—"}
        </span>
      ),
    },
    ...(role === "teacher"
      ? [
          {
            key: "subjects",
            header: tTeachers("subjects"),
            cell: (person: PersonListItem) => {
              const subjects = person.teaching?.subjects ?? [];
              if (subjects.length === 0) {
                return (
                  <span className="text-xs text-muted-foreground">
                    {tTeachers("no_assignments")}
                  </span>
                );
              }
              return (
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {subjects.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            key: "classes",
            header: tTeachers("classes"),
            cell: (person: PersonListItem) => {
              const assignedClasses = person.teaching?.classes ?? [];
              if (assignedClasses.length === 0) {
                return <span className="text-xs text-muted-foreground">—</span>;
              }
              return (
                <div className="flex flex-wrap gap-1">
                  {assignedClasses.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              );
            },
          },
        ]
      : []),
    ...(role === "student"
      ? [
          {
            key: "class",
            header: tStudents("class"),
            cell: (person: PersonListItem) =>
              person.currentClass?.name ? (
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {person.currentClass.name}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{tStudents("no_class")}</span>
              ),
          },
          {
            key: "parents",
            header: tStudents("parents"),
            cell: (person: PersonListItem) => namesOf(person),
          },
        ]
      : []),
    ...(role === "parent"
      ? [
          {
            key: "children",
            header: tParents("children"),
            cell: (person: PersonListItem) => namesOf(person),
          },
        ]
      : []),
    ...(role === "staff"
      ? [
          {
            key: "created_at",
            header: t("fields.created_at"),
            cell: (person: PersonListItem) => (
              <span className="text-xs text-muted-foreground">
                {format.dateTime(new Date(person.createdAt), { dateStyle: "medium" })}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "status",
      header: t("fields.status"),
      cell: (person) =>
        person.isActive ? (
          <StatusBadge tone="success" label={t("active")} />
        ) : (
          <StatusBadge tone="muted" label={t("inactive")} />
        ),
    },
  ];

  const rows = list.data?.items ?? [];
  const isEmpty = !list.isLoading && !list.isError && rows.length === 0;
  const isFiltered = Boolean(urlSearch || classId);

  return (
    <>
      <PageHeader
        title={tr("title")}
        description={tr("subtitle")}
        actions={
          canManage && (
            <Button onClick={dialogs.openCreate}>
              <Plus aria-hidden />
              {tr("add")}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
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

        {role === "student" && currentYearId && (
          <Select
            value={classId ?? ALL_CLASSES}
            onValueChange={(value) =>
              setParams({ class: value === ALL_CLASSES ? null : value, page: null })
            }
          >
            <SelectTrigger className="w-48" aria-label={tStudents("class")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLASSES}>{tStudents("all_classes")}</SelectItem>
              {(classes.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {list.isError ? (
        <EmptyState
          icon={Users}
          title={toMessage(list.error)}
          action={
            <Button variant="outline" onClick={() => void list.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : isEmpty ? (
        <EmptyState icon={Users} title={isFiltered ? t("empty_search") : tr("empty")} />
      ) : (
        <>
          <EntityTable
            rows={rows}
            columns={columns}
            rowKey={(person) => person.id}
            isLoading={list.isLoading}
            actionsLabel={tc("actions")}
            actions={
              canManage
                ? (person) => (
                    <>
                      <IconAction
                        icon={Pencil}
                        label={tc("edit")}
                        onClick={() => dialogs.openEdit(person)}
                      />
                      <IconAction
                        icon={KeyRound}
                        label={t("reset_password")}
                        onClick={() => setResetting(person)}
                      />
                      {person.isActive ? (
                        <IconAction
                          icon={PowerOff}
                          label={t("deactivate")}
                          destructive
                          onClick={() => dialogs.askDelete(person)}
                        />
                      ) : (
                        <IconAction
                          icon={Power}
                          label={t("activate")}
                          disabled={setActive.isPending}
                          onClick={() => toggleActive(person, true)}
                        />
                      )}
                    </>
                  )
                : undefined
            }
          />
          <TablePagination
            page={page}
            pageCount={list.data?.pageCount ?? 1}
            onPageChange={(next) => setParams({ page: next })}
          />
        </>
      )}

      <PersonFormDialog
        key={dialogs.editing?.id ?? "new"}
        role={role}
        open={dialogs.formOpen}
        onOpenChange={dialogs.setFormOpen}
        person={dialogs.editing}
        currentYearId={currentYearId}
        classes={classes.data ?? []}
      />
      <ResetPasswordDialog
        key={resetting?.id ?? "none"}
        person={resetting}
        onOpenChange={(open) => !open && setResetting(null)}
        reset={resetPassword}
      />
      <ConfirmDialog
        open={Boolean(dialogs.deleting)}
        onOpenChange={(open) => !open && dialogs.closeDelete()}
        title={t("deactivate_title", { name: dialogs.deleting?.fullName ?? "" })}
        description={t("deactivate_description")}
        confirmLabel={t("deactivate")}
        isPending={setActive.isPending}
        onConfirm={() => dialogs.deleting && toggleActive(dialogs.deleting, false)}
      />
    </>
  );
}

function namesOf(person: PersonListItem) {
  const names = person.links?.map((link) => link.fullName) ?? [];
  return names.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
        >
          {name}
        </span>
      ))}
    </div>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}
