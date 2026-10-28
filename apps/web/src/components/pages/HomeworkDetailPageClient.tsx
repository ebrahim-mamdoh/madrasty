"use client";

import { ArrowRight, ClipboardList, Eye, Pencil, Trash2, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { homeworkStatus, type SubmissionRosterEntry } from "@madrasty/core";
import { AttachmentList } from "@/components/homework/AttachmentList";
import { HomeworkFormDialog } from "@/components/homework/HomeworkFormDialog";
import { HomeworkStatusBadge } from "@/components/homework/HomeworkStatusBadge";
import { SubmissionReviewDialog } from "@/components/homework/SubmissionReviewDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { IconAction } from "@/components/shared/IconAction";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteHomework,
  useHomeworkDetail,
  useSubmissions,
} from "@/hooks/queries/homework/useHomework";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { Link, useRouter } from "@/i18n/navigation";
import { notifyError, notifySuccess } from "@/lib/utils";

export type HomeworkDetailPageClientProps = {
  id: string;
  /** Where the list lives ("/teacher/homework" or "/admin/homework"). */
  basePath: string;
  /** Edit / delete / grade (the DB enforces the same rule). */
  canManage: boolean;
};

/** One homework: what was asked, and every student's submission with grading. */
export function HomeworkDetailPageClient({ id, basePath, canManage }: HomeworkDetailPageClientProps) {
  const t = useTranslations("homework");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const router = useRouter();

  const homework = useHomeworkDetail(id);
  const submissions = useSubmissions(homework.data);
  const remove = useDeleteHomework();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewing, setReviewing] = useState<SubmissionRosterEntry | null>(null);

  const back = (
    <Button variant="ghost" size="sm" className="mb-2 -ms-2" asChild>
      <Link href={basePath}>
        <ArrowRight aria-hidden className="ltr:rotate-180" />
        {t("back")}
      </Link>
    </Button>
  );

  if (homework.isLoading) {
    return (
      <>
        {back}
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="h-40" />
      </>
    );
  }
  if (homework.isError || !homework.data) {
    return (
      <>
        {back}
        <EmptyState icon={ClipboardList} title={toMessage(homework.error)} />
      </>
    );
  }

  const item = homework.data;
  const roster = submissions.data ?? [];
  const submittedCount = roster.filter((r) => r.submission).length;

  const columns: EntityColumn<SubmissionRosterEntry>[] = [
    {
      key: "name",
      header: t("student"),
      cell: (row) => <span className="font-medium">{row.fullName}</span>,
    },
    {
      key: "status",
      header: t("status_label"),
      cell: (row) => <HomeworkStatusBadge status={homeworkStatus(item.dueAt, row.submission)} />,
    },
    {
      key: "submitted_at",
      header: t("submitted_on"),
      cell: (row) =>
        row.submission ? (
          <span className="text-sm text-muted-foreground">
            {format.dateTime(new Date(row.submission.submittedAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "score",
      header: t("score"),
      cell: (row) =>
        typeof row.submission?.score === "number" ? (
          <span className="font-semibold tabular-nums">
            {format.number(row.submission.score)}
            {item.maxScore ? ` / ${format.number(item.maxScore)}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const onDelete = () =>
    remove.mutate(item, {
      onSuccess: () => {
        notifySuccess(tc("deleted"));
        router.push(basePath);
      },
      onError: (error) => notifyError(toMessage(error)),
      onSettled: () => setDeleting(false),
    });

  return (
    <>
      {back}
      <PageHeader
        title={item.title}
        description={`${item.className} — ${item.subjectName}`}
        actions={
          canManage && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil aria-hidden />
                {tc("edit")}
              </Button>
              <Button variant="outline" className="text-destructive" onClick={() => setDeleting(true)}>
                <Trash2 aria-hidden />
                {tc("delete")}
              </Button>
            </>
          )
        }
      />

      <Card className="mb-6">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t("due_at")}: </span>
              <span className="font-medium">
                {format.dateTime(new Date(item.dueAt), { dateStyle: "full", timeStyle: "short" })}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">{t("max_score")}: </span>
              <span className="font-medium">
                {item.maxScore ? format.number(item.maxScore) : t("not_scored")}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">{t("submitted_count")}: </span>
              <span className="font-medium tabular-nums">
                {format.number(submittedCount)} / {format.number(roster.length)}
              </span>
            </p>
          </div>
          {item.body && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">
              {item.body}
            </p>
          )}
          <AttachmentList attachments={item.attachments} />
        </CardContent>
      </Card>

      <h2 className="mb-3 text-lg font-semibold">{t("submissions")}</h2>
      {submissions.isError ? (
        <EmptyState icon={Users} title={toMessage(submissions.error)} />
      ) : !submissions.isLoading && roster.length === 0 ? (
        <EmptyState icon={Users} title={t("no_students")} />
      ) : (
        <EntityTable
          rows={roster}
          columns={columns}
          rowKey={(row) => row.studentId}
          isLoading={submissions.isLoading}
          actionsLabel={tc("actions")}
          actions={(row) =>
            row.submission ? (
              <IconAction
                icon={Eye}
                label={canManage ? t("review") : t("view_answer")}
                onClick={() => setReviewing(row)}
              />
            ) : null
          }
        />
      )}

      {canManage && (
        <HomeworkFormDialog
          key={`${item.id}:${item.dueAt}:${item.attachments.length}`}
          open={editing}
          onOpenChange={setEditing}
          homework={item}
        />
      )}
      <SubmissionReviewDialog
        key={reviewing?.studentId ?? "none"}
        homework={item}
        entry={reviewing}
        canGrade={canManage}
        onOpenChange={(open) => !open && setReviewing(null)}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("delete_title")}
        description={t("delete_description")}
        isPending={remove.isPending}
        onConfirm={onDelete}
      />
    </>
  );
}
