"use client";

import { BookOpen, ListPlus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ClassSubject, PersonOption, SchoolClass, Subject } from "@madrasty/core";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { AppDialogContent } from "@/components/shared/AppDialogContent";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddClassSubjects,
  useClassSubjects,
  useRemoveClassSubject,
  useSetClassSubjectTeacher,
} from "@/hooks/queries/structure/useStructure";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifyError, notifySuccess } from "@/lib/utils";

/** Radix Select can't hold "", so "no teacher" uses a sentinel value. */
const NO_TEACHER = "__none__";

export type ClassSubjectsDialogProps = {
  schoolClass: SchoolClass | null;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  teachers: PersonOption[];
  canManage: boolean;
};

/** Which subjects a class studies and who teaches each — every change saves immediately. */
export function ClassSubjectsDialog({
  schoolClass,
  onOpenChange,
  subjects,
  teachers,
  canManage,
}: ClassSubjectsDialogProps) {
  const t = useTranslations("structure.classes");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();

  const assigned = useClassSubjects(schoolClass?.id);
  const add = useAddClassSubjects();
  const setTeacher = useSetClassSubjectTeacher();
  const remove = useRemoveClassSubject();
  const [toAdd, setToAdd] = useState<string>("");

  const rows = assigned.data ?? [];
  const assignedIds = new Set(rows.map((row) => row.subject.id));
  const available = subjects.filter((subject) => !assignedIds.has(subject.id));
  const onError = (error: unknown) => notifyError(toMessage(error));

  const addSubjects = (subjectIds: string[]) => {
    if (!schoolClass || subjectIds.length === 0) return;
    add.mutate(
      { classId: schoolClass.id, subjectIds },
      {
        onSuccess: () => {
          setToAdd("");
          notifySuccess(t("subject_added"));
        },
        onError,
      },
    );
  };

  const columns: EntityColumn<ClassSubject>[] = [
    {
      key: "subject",
      header: t("subject"),
      cell: (row) => <span className="font-medium">{row.subject.name}</span>,
    },
    {
      key: "teacher",
      header: t("teacher"),
      cell: (row) =>
        canManage ? (
          <Select
            value={row.teacher?.id ?? NO_TEACHER}
            disabled={setTeacher.isPending}
            onValueChange={(value) =>
              setTeacher.mutate(
                { id: row.id, teacherId: value === NO_TEACHER ? null : value },
                { onSuccess: () => notifySuccess(t("teacher_updated")), onError },
              )
            }
          >
            <SelectTrigger className="w-full min-w-44" aria-label={t("teacher")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEACHER}>{t("no_teacher")}</SelectItem>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          (row.teacher?.fullName ?? (
            <span className="text-muted-foreground">{t("no_teacher")}</span>
          ))
        ),
    },
  ];

  return (
    <Dialog open={Boolean(schoolClass)} onOpenChange={onOpenChange}>
      <AppDialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("subjects_title", { name: schoolClass?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("subjects_description")}</DialogDescription>
        </DialogHeader>

        {subjects.length === 0 ? (
          <EmptyState icon={BookOpen} title={t("need_subjects")} />
        ) : (
          <div className="space-y-4">
            {!assigned.isLoading && rows.length === 0 ? (
              <EmptyState icon={BookOpen} title={t("no_subjects")} className="py-8" />
            ) : (
              <EntityTable
                rows={rows}
                columns={columns}
                rowKey={(row) => row.id}
                isLoading={assigned.isLoading}
                skeletonRows={3}
                actionsLabel={tc("actions")}
                actions={
                  canManage
                    ? (row) => (
                        <IconAction
                          icon={Trash2}
                          label={t("remove_subject")}
                          destructive
                          disabled={remove.isPending}
                          onClick={() =>
                            remove.mutate(row.id, {
                              onSuccess: () => notifySuccess(t("subject_removed")),
                              onError,
                            })
                          }
                        />
                      )
                    : undefined
                }
              />
            )}

            {canManage &&
              (available.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">{t("all_added")}</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={toAdd} onValueChange={setToAdd}>
                    <SelectTrigger
                      className="min-w-56 flex-1"
                      aria-label={t("add_subject_placeholder")}
                    >
                      <SelectValue placeholder={t("add_subject_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button disabled={!toAdd || add.isPending} onClick={() => addSubjects([toAdd])}>
                    <Plus aria-hidden />
                    {t("add_subject")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={add.isPending}
                    onClick={() => addSubjects(available.map((subject) => subject.id))}
                  >
                    <ListPlus aria-hidden />
                    {t("add_all")}
                  </Button>
                </div>
              ))}
          </div>
        )}
      </AppDialogContent>
    </Dialog>
  );
}
