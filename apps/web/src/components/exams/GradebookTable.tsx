"use client";

import { Trophy } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useGradebook } from "@/hooks/queries/exams/useExams";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { Link } from "@/i18n/navigation";

/** Students × exams of one class subject, with each exam's class average. */
export function GradebookTable({
  classSubjectId,
  classId,
  examPath,
}: {
  classSubjectId: string | undefined;
  classId: string | undefined;
  /** Exam detail route prefix for the column headers. */
  examPath: string;
}) {
  const t = useTranslations("exams");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const book = useGradebook(classSubjectId, classId);

  if (!classSubjectId) return null;
  if (book.isError) return <EmptyState icon={Trophy} title={toMessage(book.error)} />;
  if (book.isLoading || !book.data) return <Skeleton className="h-48" />;
  const { exams, rows } = book.data;
  if (exams.length === 0) return <EmptyState icon={Trophy} title={t("gradebook_empty")} />;

  const average = (examId: string) => {
    const scores = rows.map((r) => r.scores[examId]).filter((s): s is number => s !== null && s !== undefined);
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  };

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="sticky start-0 bg-muted p-3 text-start font-medium">{t("student")}</th>
            {exams.map((exam) => (
              <th key={exam.id} className="p-3 text-start align-top font-medium">
                <Link href={`${examPath}/${exam.id}`} className="hover:underline">
                  {exam.title}
                </Link>
                <span className="mt-1 flex flex-wrap items-center gap-1 text-xs font-normal text-muted-foreground">
                  {t(`kinds.${exam.kind}`)} · / {format.number(exam.maxScore)}
                  <ExamStatusBadge status={exam.status} className="ms-1" />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-t">
              <td className="sticky start-0 bg-card p-3 font-medium">{row.fullName}</td>
              {exams.map((exam) => (
                <td key={exam.id} className="p-3 tabular-nums">
                  {typeof row.scores[exam.id] === "number" ? (
                    format.number(row.scores[exam.id]!)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t bg-muted/30">
            <td className="sticky start-0 bg-muted p-3 font-medium">{t("class_average")}</td>
            {exams.map((exam) => {
              const avg = average(exam.id);
              return (
                <td key={exam.id} className="p-3 font-semibold tabular-nums">
                  {avg === null ? "—" : format.number(avg, { maximumFractionDigits: 2 })}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
