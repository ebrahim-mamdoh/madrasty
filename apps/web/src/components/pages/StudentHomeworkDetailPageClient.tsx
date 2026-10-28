"use client";

import { ArrowRight, Loader2, NotebookPen, Send } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { homeworkStatus, type StudentHomework } from "@madrasty/core";
import { AttachmentList } from "@/components/homework/AttachmentList";
import { AttachmentsField, type AttachmentsValue } from "@/components/homework/AttachmentsField";
import { HomeworkStatusBadge } from "@/components/homework/HomeworkStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useStudentHomework, useSubmitHomework } from "@/hooks/queries/homework/useHomework";
import { useMyClass } from "@/hooks/queries/timetable/useTimetable";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { Link } from "@/i18n/navigation";
import { notifySuccess } from "@/lib/utils";

/** Student → one homework: the task, their answer (editable until graded), and the grade. */
export function StudentHomeworkDetailPageClient({ id }: { id: string }) {
  const t = useTranslations("homework");
  const toMessage = useErrorMessage();
  const myClass = useMyClass();
  const list = useStudentHomework(myClass.data?.id);
  const item = list.data?.find((h) => h.id === id);

  const back = (
    <Button variant="ghost" size="sm" className="mb-2 -ms-2" asChild>
      <Link href="/student/homework">
        <ArrowRight aria-hidden className="ltr:rotate-180" />
        {t("back")}
      </Link>
    </Button>
  );

  if (myClass.isLoading || list.isLoading) {
    return (
      <>
        {back}
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="h-60" />
      </>
    );
  }
  if (!item) {
    return (
      <>
        {back}
        <EmptyState icon={NotebookPen} title={list.error ? toMessage(list.error) : t("not_found")} />
      </>
    );
  }

  return (
    <>
      {back}
      {/* Re-seeded after a save so the form shows exactly what was stored. */}
      <HomeworkView key={item.submission?.submittedAt ?? "new"} item={item} />
    </>
  );
}

function HomeworkView({ item }: { item: StudentHomework }) {
  const t = useTranslations("homework");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const submit = useSubmitHomework();
  const status = homeworkStatus(item.dueAt, item.submission);
  const locked = status === "graded";

  const [body, setBody] = useState(item.submission?.body ?? "");
  const [files, setFiles] = useState<AttachmentsValue>({
    kept: item.submission?.attachments ?? [],
    added: [],
  });
  const isEmpty = !body.trim() && files.kept.length + files.added.length === 0;

  const onSubmit = () =>
    submit.mutate(
      {
        homeworkId: item.id,
        body: body.trim(),
        kept: files.kept,
        files: files.added.map((file) => ({ file, name: file.name })),
        previous: item.submission,
      },
      { onSuccess: () => notifySuccess(t("submitted_done")) },
    );

  return (
    <>
      <PageHeader
        title={item.title}
        description={item.subjectName}
        actions={<HomeworkStatusBadge status={status} />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("task")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">{t("due_at")}: </span>
                <span className="font-medium">
                  {format.dateTime(new Date(item.dueAt), { dateStyle: "full", timeStyle: "short" })}
                </span>
              </p>
              {item.maxScore && (
                <p>
                  <span className="text-muted-foreground">{t("max_score")}: </span>
                  <span className="font-medium">{format.number(item.maxScore)}</span>
                </p>
              )}
            </div>
            {item.body ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap" dir="auto">
                {item.body}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("no_description")}</p>
            )}
            <AttachmentList attachments={item.attachments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("my_answer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {locked && item.submission && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                  <p className="text-sm text-muted-foreground">{t("score")}</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {item.submission.score !== null ? format.number(item.submission.score) : "—"}
                    {item.maxScore ? (
                      <span className="text-base font-normal text-muted-foreground">
                        {" "}
                        / {format.number(item.maxScore)}
                      </span>
                    ) : null}
                  </p>
                  {item.submission.feedback && (
                    <p className="mt-2 text-sm whitespace-pre-wrap" dir="auto">
                      {item.submission.feedback}
                    </p>
                  )}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor="answer">{t("answer")}</FieldLabel>
                <Textarea
                  id="answer"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={6}
                  maxLength={5000}
                  disabled={locked || submit.isPending}
                  placeholder={t("answer_placeholder")}
                  className="max-h-96"
                />
              </Field>
              <AttachmentsField
                label={t("attachments")}
                value={files}
                onChange={setFiles}
                disabled={locked || submit.isPending}
              />
              {status === "late" && <p className="text-sm text-destructive">{t("late_warning")}</p>}
              {submit.isError && <FieldError>{toMessage(submit.error)}</FieldError>}
              {!locked && (
                <div>
                  <Button onClick={onSubmit} disabled={submit.isPending || isEmpty}>
                    {submit.isPending ? (
                      <Loader2 aria-hidden className="animate-spin" />
                    ) : (
                      <Send aria-hidden />
                    )}
                    {item.submission ? t("resubmit") : t("submit")}
                  </Button>
                </div>
              )}
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
