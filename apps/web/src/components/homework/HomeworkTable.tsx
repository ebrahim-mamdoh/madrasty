"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { HomeworkWithStats } from "@madrasty/core";
import { EntityTable, type EntityColumn } from "@/components/shared/EntityTable";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

export type HomeworkTableProps = {
  rows: HomeworkWithStats[];
  isLoading: boolean;
  /** Detail route prefix, e.g. "/teacher/homework". */
  basePath: string;
};

/** Teacher and admin lists: what was assigned, when it's due and how the class is doing. */
export function HomeworkTable({ rows, isLoading, basePath }: HomeworkTableProps) {
  const t = useTranslations("homework");
  const format = useFormatter();
  const now = new Date();

  const columns: EntityColumn<HomeworkWithStats>[] = [
    {
      key: "title",
      header: t("title_field"),
      cell: (row) => (
        <div className="min-w-0">
          <Link href={`${basePath}/${row.id}`} className="font-medium hover:underline">
            {row.title}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {row.className} — {row.subjectName}
          </p>
        </div>
      ),
    },
    {
      key: "due",
      header: t("due_at"),
      cell: (row) => {
        const closed = new Date(row.dueAt) < now;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">
              {format.dateTime(new Date(row.dueAt), { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <Badge variant={closed ? "secondary" : "outline"}>{closed ? t("closed") : t("open")}</Badge>
          </div>
        );
      },
    },
    {
      key: "submitted",
      header: t("submitted_count"),
      cell: (row) => (
        <span className="tabular-nums">
          {format.number(row.submitted)} / {format.number(row.students)}
        </span>
      ),
    },
    {
      key: "graded",
      header: t("graded_count"),
      cell: (row) => <span className="tabular-nums">{format.number(row.graded)}</span>,
    },
  ];

  return <EntityTable rows={rows} columns={columns} rowKey={(row) => row.id} isLoading={isLoading} />;
}
