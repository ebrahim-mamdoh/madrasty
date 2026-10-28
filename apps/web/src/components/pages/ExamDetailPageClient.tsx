"use client";

import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Megaphone,
  Pencil,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { ExamTransition } from "@madrasty/api";
import { ExamFormDialog } from "@/components/exams/ExamFormDialog";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { QuestionsSection } from "@/components/exams/QuestionsSection";
import { ResultsSection } from "@/components/exams/ResultsSection";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { AppDialogContent } from "@/components/shared/AppDialogContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteExam, useExam, useExamTransition } from "@/hooks/queries/exams/useExams";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { Link, useRouter } from "@/i18n/navigation";
import { notifyError, notifySuccess } from "@/lib/utils";

export type ExamDetailPageClientProps = {
  id: string;
  basePath: string;
  /** Build/edit the draft, submit it, record results before publishing, publish. */
  canManage: boolean;
  /** exams.approve: approve or reject pending exams (and publish). */
  canApprove: boolean;
  /** grades.edit: change results at any time after approval. */
  canEditGrades: boolean;
};

export function ExamDetailPageClient({
  id,
  basePath,
  canManage,
  canApprove,
  canEditGrades,
}: ExamDetailPageClientProps) {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const router = useRouter();

  const exam = useExam(id);
  const transition = useExamTransition();
  const remove = useDeleteExam();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState<Exclude<ExamTransition, "reject"> | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const back = (
    <Button variant="ghost" size="sm" className="mb-2 -ms-2" asChild>
      <Link href={basePath}>
        <ArrowRight aria-hidden className="ltr:rotate-180" />
        {t("back")}
      </Link>
    </Button>
  );

  if (exam.isLoading) {
    return (
      <>
        {back}
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="h-40" />
      </>
    );
  }
  if (exam.isError || !exam.data) {
    return (
      <>
        {back}
        <EmptyState icon={ClipboardList} title={toMessage(exam.error)} />
      </>
    );
  }

  const item = exam.data;
  const isDraft = item.status === "draft";
  const showResults = item.status === "approved" || item.status === "published";
  const resultsEditable =
    (item.status === "approved" && canManage) || (showResults && canEditGrades);

  const run = (action: ExamTransition, reason?: string) =>
    transition.mutate(
      { id: item.id, action, note: reason },
      {
        onSuccess: () => {
          notifySuccess(t(`transitions.${action}_done`));
          setConfirming(null);
          setRejecting(false);
          setNote("");
        },
        onError: (error) => notifyError(toMessage(error)),
      },
    );

  return (
    <>
      {back}
      <PageHeader
        title={item.title}
        description={`${item.className} — ${item.subjectName}`}
        actions={
          <>
            <ExamStatusBadge status={item.status} />
            {isDraft && canManage && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden />
                  {tc("edit")}
                </Button>
                <Button variant="outline" className="text-destructive" onClick={() => setDeleting(true)}>
                  <Trash2 aria-hidden />
                  {tc("delete")}
                </Button>
                <Button onClick={() => setConfirming("submit")}>
                  <Send aria-hidden />
                  {t("transitions.submit")}
                </Button>
              </>
            )}
            {item.status === "pending" && canApprove && (
              <>
                <Button variant="outline" className="text-destructive" onClick={() => setRejecting(true)}>
                  <XCircle aria-hidden />
                  {t("transitions.reject")}
                </Button>
                <Button onClick={() => setConfirming("approve")}>
                  <CheckCircle2 aria-hidden />
                  {t("transitions.approve")}
                </Button>
              </>
            )}
            {item.status === "approved" && (canManage || canApprove) && (
              <Button onClick={() => setConfirming("publish")}>
                <Megaphone aria-hidden />
                {t("transitions.publish")}
              </Button>
            )}
          </>
        }
      />

      {isDraft && item.reviewNote && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">{t("rejected_note")}</p>
          <p className="mt-1 whitespace-pre-wrap" dir="auto">
            {item.reviewNote}
          </p>
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">{t("kind")}: </span>
            <span className="font-medium">{t(`kinds.${item.kind}`)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("mode")}: </span>
            <span className="font-medium">{t(`modes.${item.mode}`)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("starts_at")}: </span>
            <span className="font-medium">
              {format.dateTime(new Date(item.startsAt), { dateStyle: "full", timeStyle: "short" })}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("duration")}: </span>
            <span className="font-medium">{t("minutes", { n: item.durationMinutes })}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("max_score")}: </span>
            <span className="font-medium">{format.number(item.maxScore)}</span>
          </p>
          {item.instructions && (
            <p className="basis-full whitespace-pre-wrap text-muted-foreground" dir="auto">
              {item.instructions}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-10">
        {item.mode === "online" && <QuestionsSection exam={item} editable={isDraft && canManage} />}
        {showResults && <ResultsSection exam={item} editable={resultsEditable} />}
      </div>

      {canManage && isDraft && (
        <ExamFormDialog
          key={`${item.id}:${item.startsAt}:${item.title}`}
          open={editing}
          onOpenChange={setEditing}
          exam={item}
        />
      )}
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t("delete_title")}
        description={t("delete_description")}
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(item.id, {
            onSuccess: () => {
              notifySuccess(tc("deleted"));
              router.push(basePath);
            },
            onError: (error) => notifyError(toMessage(error)),
            onSettled: () => setDeleting(false),
          })
        }
      />
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming ? t(`transitions.${confirming}_title`) : ""}
        description={confirming ? t(`transitions.${confirming}_description`) : ""}
        confirmLabel={confirming ? t(`transitions.${confirming}`) : undefined}
        destructive={false}
        isPending={transition.isPending}
        onConfirm={() => confirming && run(confirming)}
      />
      <Dialog open={rejecting} onOpenChange={(open) => !transition.isPending && setRejecting(open)}>
        <AppDialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transitions.reject_title")}</DialogTitle>
            <DialogDescription>{t("transitions.reject_description")}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="reject-note">{t("reject_reason")}</FieldLabel>
            <Textarea
              id="reject-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={500}
            />
            {transition.isError && <FieldError>{toMessage(transition.error)}</FieldError>}
          </Field>
          <DialogFooter>
            <Button variant="outline" disabled={transition.isPending} onClick={() => setRejecting(false)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={transition.isPending || note.trim().length < 3}
              onClick={() => run("reject", note.trim())}
            >
              {t("transitions.reject")}
            </Button>
          </DialogFooter>
        </AppDialogContent>
      </Dialog>
    </>
  );
}
