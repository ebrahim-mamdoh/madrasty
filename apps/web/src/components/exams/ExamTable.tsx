"use client";

import { Monitor, FileText } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { Exam } from "@madrasty/core";
import { ExamStatusBadge } from "@/components/exams/ExamStatusBadge";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { Link } from "@/i18n/navigation";

export function ExamTable({
  rows,
  isLoading,
  basePath,
}: {
  rows: Exam[];
  isLoading: boolean;
  basePath: string;
}) {
  const t = useTranslations("exams");
  const format = useFormatter();

  const columns: EntityColumn<Exam>[] = [
    {
      key: "title",
      header: t("title_field"),
      cell: (exam) => (
        <div className="min-w-0">
          <Link href={`${basePath}/${exam.id}`} className="font-medium hover:underline">
            {exam.title}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {exam.className} — {exam.subjectName}
          </p>
        </div>
      ),
    },
    {
      key: "kind",
      header: t("kind"),
      cell: (exam) => (
        <span className="flex items-center gap-1.5 text-sm">
          {exam.mode === "online" ? (
            <Monitor aria-label={t("modes.online")} className="size-4 text-primary" />
          ) : (
            <FileText aria-label={t("modes.paper")} className="size-4 text-muted-foreground" />
          )}
          {t(`kinds.${exam.kind}`)}
        </span>
      ),
    },
    {
      key: "date",
      header: t("starts_at"),
      cell: (exam) => (
        <span className="text-sm text-muted-foreground">
          {format.dateTime(new Date(exam.startsAt), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      ),
    },
    {
      key: "status",
      header: t("status_label"),
      cell: (exam) => <ExamStatusBadge status={exam.status} />,
    },
  ];

  return <EntityTable rows={rows} columns={columns} rowKey={(exam) => exam.id} isLoading={isLoading} />;
}
