"use client";

import { BookOpen, DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { SchoolClass } from "@madrasty/core";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { ClassFormDialog } from "@/components/structure/ClassFormDialog";
import { ClassSubjectsDialog } from "@/components/structure/ClassSubjectsDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAcademicYears,
  useClasses,
  useDeleteClass,
  useGradeLevels,
  useSubjects,
  useTeacherOptions,
} from "@/hooks/queries/structure/useStructure";
import { useCrudDialogs } from "@/hooks/useCrudDialogs";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { usePermission } from "@/hooks/useSession";
import { useUrlState } from "@/hooks/useUrlState";
import { notifyError, notifySuccess } from "@/lib/utils";

export function ClassesPanel() {
  const t = useTranslations("structure.classes");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const canManage = usePermission("structure.manage");
  const { searchParams, setParams } = useUrlState();

  const years = useAcademicYears();
  const grades = useGradeLevels();
  const teachers = useTeacherOptions();

  // Selected year lives in the URL; default to the current year, then the newest one.
  const yearList = years.data ?? [];
  const requestedYear = searchParams.get("year");
  const yearId =
    yearList.find((year) => year.id === requestedYear)?.id ??
    yearList.find((year) => year.isCurrent)?.id ??
    yearList[0]?.id;

  const classes = useClasses(yearId);
  const subjects = useSubjects();
  const remove = useDeleteClass();
  const dialogs = useCrudDialogs<SchoolClass>();
  const [subjectsFor, setSubjectsFor] = useState<SchoolClass | null>(null);

  const columns: EntityColumn<SchoolClass>[] = [
    {
      key: "name",
      header: t("name"),
      cell: (schoolClass) => <span className="font-medium">{schoolClass.name}</span>,
    },
    { key: "grade", header: t("grade"), cell: (schoolClass) => schoolClass.gradeLevel.name },
    {
      key: "homeroom",
      header: t("homeroom"),
      cell: (schoolClass) =>
        schoolClass.homeroomTeacher?.fullName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "subjects",
      header: t("subjects"),
      cell: (schoolClass) => format.number(schoolClass.subjectsCount),
      className: "text-end tabular-nums",
    },
    {
      key: "students",
      header: t("students"),
      cell: (schoolClass) => format.number(schoolClass.studentsCount),
      className: "text-end tabular-nums",
    },
  ];

  const onConfirmDelete = () => {
    if (!dialogs.deleting) return;
    remove.mutate(dialogs.deleting.id, {
      onSuccess: () => notifySuccess(tc("deleted")),
      onError: (error) => notifyError(toMessage(error)),
      onSettled: dialogs.closeDelete,
    });
  };

  // Classes need a year and at least one grade level to exist first.
  if (!years.isLoading && yearList.length === 0) {
    return <EmptyState icon={DoorOpen} title={t("need_year")} />;
  }

  const hasGrades = (grades.data?.length ?? 0) > 0;
  const isEmpty = !classes.isLoading && !classes.isError && classes.data?.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={yearId} onValueChange={(value) => setParams({ year: value })}>
          <SelectTrigger className="w-56" aria-label={t("year")}>
            <SelectValue placeholder={t("year")} />
          </SelectTrigger>
          <SelectContent>
            {yearList.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                <span dir="ltr">{year.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage && hasGrades && (
          <Button onClick={dialogs.openCreate} disabled={!yearId}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        )}
      </div>

      {!grades.isLoading && !hasGrades ? (
        <EmptyState icon={DoorOpen} title={t("need_grades")} />
      ) : classes.isError ? (
        <EmptyState
          icon={DoorOpen}
          title={toMessage(classes.error)}
          action={
            <Button variant="outline" onClick={() => void classes.refetch()}>
              {tc("retry")}
            </Button>
          }
        />
      ) : isEmpty ? (
        <EmptyState icon={DoorOpen} title={t("empty")} description={t("empty_hint")} />
      ) : (
        <EntityTable
          rows={classes.data ?? []}
          columns={columns}
          rowKey={(schoolClass) => schoolClass.id}
          isLoading={classes.isLoading || years.isLoading}
          actionsLabel={tc("actions")}
          actions={(schoolClass) => (
            <>
              {/* Everyone with structure.view may see a class's subjects; only managers edit. */}
              <IconAction
                icon={BookOpen}
                label={t("manage_subjects")}
                onClick={() => setSubjectsFor(schoolClass)}
              />
              {canManage && (
                <>
                  <IconAction
                    icon={Pencil}
                    label={tc("edit")}
                    onClick={() => dialogs.openEdit(schoolClass)}
                  />
                  <IconAction
                    icon={Trash2}
                    label={schoolClass.studentsCount > 0 ? t("in_use") : tc("delete")}
                    destructive
                    disabled={schoolClass.studentsCount > 0}
                    onClick={() => dialogs.askDelete(schoolClass)}
                  />
                </>
              )}
            </>
          )}
        />
      )}

      <ClassSubjectsDialog
        key={subjectsFor?.id ?? "none"}
        schoolClass={subjectsFor}
        onOpenChange={(open) => !open && setSubjectsFor(null)}
        subjects={subjects.data ?? []}
        teachers={teachers.data ?? []}
        canManage={canManage}
      />

      {yearId && (
        <ClassFormDialog
          key={dialogs.editing?.id ?? `new-${yearId}`}
          open={dialogs.formOpen}
          onOpenChange={dialogs.setFormOpen}
          schoolClass={dialogs.editing}
          academicYearId={yearId}
          gradeLevels={grades.data ?? []}
          teachers={teachers.data ?? []}
        />
      )}
      <ConfirmDialog
        open={Boolean(dialogs.deleting)}
        onOpenChange={(open) => !open && dialogs.closeDelete()}
        title={t("delete_title")}
        description={t("delete_description", { name: dialogs.deleting?.name ?? "" })}
        isPending={remove.isPending}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
