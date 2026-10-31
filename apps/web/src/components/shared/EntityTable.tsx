"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type EntityColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export type EntityTableProps<T> = {
  rows: T[];
  columns: EntityColumn<T>[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  /** Trailing per-row actions (edit/delete…). The column is omitted when not provided. */
  actions?: (row: T) => ReactNode;
  actionsLabel?: string;
  skeletonRows?: number;
  className?: string;
};

/**
 * Lightweight table for small, unpaginated lists (school structure, settings…).
 * Paginated server-driven lists use their own table with URL state.
 */
export function EntityTable<T>({
  rows,
  columns,
  rowKey,
  isLoading,
  actions,
  actionsLabel,
  skeletonRows = 4,
  className,
}: EntityTableProps<T>) {
  const columnCount = columns.length + (actions ? 1 : 0);

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {actions && (
              <TableHead className="w-28 text-end">
                {actionsLabel ? <span>{actionsLabel}</span> : <span className="sr-only">Actions</span>}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }, (__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full max-w-28" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      <div className="flex justify-end gap-1">{actions(row)}</div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
