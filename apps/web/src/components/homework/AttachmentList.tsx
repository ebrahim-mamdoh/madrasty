"use client";

import { Download, FileText, Loader2, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { HomeworkAttachment } from "@madrasty/core";
import { Button } from "@/components/ui/button";
import { useDownloadHomeworkFile } from "@/hooks/queries/homework/useHomework";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifyError } from "@/lib/utils";

export type AttachmentListProps = {
  attachments: { name: string; size: number; path?: string }[];
  /** Saved files can be downloaded; files still being picked can be removed. */
  onRemove?: (index: number) => void;
};

export function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  const t = useTranslations("homework");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const download = useDownloadHomeworkFile();

  if (attachments.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {attachments.map((attachment, index) => (
        <li
          key={attachment.path ?? `${attachment.name}-${index}`}
          className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
        >
          <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate" dir="auto">
            {attachment.name}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums" dir="ltr">
            {attachment.size >= 1024 * 1024
              ? `${format.number(attachment.size / 1024 / 1024, { maximumFractionDigits: 1 })} MB`
              : `${format.number(Math.max(1, Math.round(attachment.size / 1024)))} KB`}
          </span>
          {attachment.path && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={t("download", { name: attachment.name })}
              disabled={download.isPending}
              onClick={() =>
                download.mutate(attachment as HomeworkAttachment, {
                  onError: (error) => notifyError(toMessage(error)),
                })
              }
            >
              {download.isPending && download.variables?.path === attachment.path ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <Download aria-hidden />
              )}
            </Button>
          )}
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              aria-label={t("remove_file", { name: attachment.name })}
              onClick={() => onRemove(index)}
            >
              <X aria-hidden />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
