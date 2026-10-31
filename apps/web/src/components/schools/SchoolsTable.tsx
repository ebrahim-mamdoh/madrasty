"use client";

import { MoreHorizontal, PauseCircle, PlayCircle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { SchoolListItem, SchoolStatus } from "@madrasty/core";
import { SchoolStatusBadge } from "@/components/schools/SchoolStatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";

export type SchoolsTableProps = {
  schools: SchoolListItem[];
  isLoading: boolean;
  onStatusChange: (id: string, status: SchoolStatus) => void;
};

const SKELETON_ROWS = 5;

export function SchoolsTable({ schools, isLoading, onStatusChange }: SchoolsTableProps) {
  const t = useTranslations("platform.schools");
  const tc = useTranslations("common");
  const format = useFormatter();

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead className="text-end">{t("students")}</TableHead>
            <TableHead className="text-end">{t("teachers")}</TableHead>
            <TableHead>{t("created_at")}</TableHead>
            <TableHead className="w-20 text-end">{tc("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }, (__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell>
                    <Link
                      href={`/platform/schools/${school.id}`}
                      className="font-medium hover:underline"
                    >
                      {school.name}
                    </Link>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {school.slug}
                    </p>
                  </TableCell>
                  <TableCell>
                    <SchoolStatusBadge status={school.status} />
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {format.number(school.studentsCount)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {format.number(school.teachersCount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format.dateTime(new Date(school.createdAt), { dateStyle: "medium" })}
                  </TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={tc("actions")}>
                          <MoreHorizontal aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {school.status === "active" ? (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => onStatusChange(school.id, "suspended")}
                          >
                            <PauseCircle aria-hidden />
                            {t("suspend")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => onStatusChange(school.id, "active")}>
                            <PlayCircle aria-hidden />
                            {t("activate")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
