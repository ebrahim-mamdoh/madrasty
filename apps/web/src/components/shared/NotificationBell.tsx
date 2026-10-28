"use client";

import {
  Bell,
  BookOpenCheck,
  CalendarX,
  CheckCheck,
  ClipboardList,
  FileText,
  NotebookPen,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { AppNotification, NotificationKind, Portal } from "@madrasty/core";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/queries/notifications/useNotifications";
import { useRouter } from "@/i18n/navigation";
import { localDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationKind, LucideIcon> = {
  absence: CalendarX,
  grade: Trophy,
  homework: NotebookPen,
  homework_missing: NotebookPen,
  exam: ClipboardList,
  monthly_report: FileText,
};

type Described = { message: string; href?: string };

/** Turns a notification's kind + data into a localized line and (when there is one) a destination. */
function useDescribe(portal: Portal) {
  const t = useTranslations("notifications.messages");
  const format = useFormatter();
  const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));
  const day = (value: unknown) => {
    const raw = text(value);
    if (!raw) return "";
    const date = raw.length === 10 ? localDate(raw) : new Date(raw);
    return format.dateTime(date, { dateStyle: "medium" });
  };
  const month = (value: unknown) => {
    const raw = text(value);
    return raw ? format.dateTime(localDate(raw), { month: "long", year: "numeric" }) : "";
  };

  return (n: AppNotification): Described => {
    const d = n.data;
    switch (n.kind) {
      case "absence":
        return { message: t("absence", { student: text(d.student_name), date: day(d.date) }) };
      case "homework_missing":
        return { message: t("homework_missing", { student: text(d.student_name), title: text(d.title) }) };
      case "homework":
        return d.event === "graded"
          ? {
              message: t("homework_graded", { title: text(d.title), score: text(d.score) }),
              href: portal === "student" ? `/student/homework/${text(d.homework_id)}` : undefined,
            }
          : {
              message: t("homework_assigned", { subject: text(d.subject), title: text(d.title), due: day(d.due_at) }),
              href: portal === "student" ? `/student/homework/${text(d.homework_id)}` : undefined,
            };
      case "exam":
        if (d.event === "approved" || d.event === "rejected") {
          return {
            message:
              d.event === "approved"
                ? t("exam_approved", { title: text(d.title) })
                : t("exam_rejected", { title: text(d.title), note: text(d.note) }),
            href: portal === "teacher" ? `/teacher/exams/${text(d.exam_id)}` : undefined,
          };
        }
        return {
          message: t("exam_scheduled", { subject: text(d.subject), title: text(d.title), date: day(d.starts_at) }),
          href: portal === "student" ? "/student/exams" : undefined,
        };
      case "grade":
        return {
          message: t("grade", {
            title: text(d.title),
            score: format.number(Number(d.score ?? 0)),
            max: format.number(Number(d.max_score ?? 0)),
          }),
          href: portal === "student" ? "/student/grades" : undefined,
        };
      case "monthly_report":
        return { message: t("monthly_report", { student: text(d.student_name), month: month(d.month) }) };
    }
  };
}

/** Header bell: unread count, the latest alerts, and quick "mark as read". */
export function NotificationBell({ portal }: { portal: Portal }) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const list = useNotifications(open);
  const markRead = useMarkNotificationsRead();
  const describe = useDescribe(portal);
  const count = unread.data ?? 0;

  const onSelect = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate([n.id]);
    const { href } = describe(n);
    if (href) router.push(href);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={count > 0 ? t("bell_unread", { count }) : t("bell")}
        >
          <Bell aria-hidden />
          {count > 0 && (
            <span className="absolute -top-0.5 -end-0.5 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white tabular-nums">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <DropdownMenuLabel className="p-0 text-base">{t("title")}</DropdownMenuLabel>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={markRead.isPending}
              onClick={() => markRead.mutate("all")}
            >
              <CheckCheck aria-hidden />
              {t("mark_all_read")}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-96 overflow-y-auto p-1">
          {list.isLoading ? (
            Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="m-2 h-12" />)
          ) : (list.data ?? []).length === 0 ? (
            <p className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
              <BookOpenCheck aria-hidden className="size-6" />
              {t("empty")}
            </p>
          ) : (
            (list.data ?? []).map((n) => {
              const Icon = ICONS[n.kind];
              return (
                <DropdownMenuItem
                  key={n.id}
                  onSelect={() => onSelect(n)}
                  className={cn("items-start gap-3 py-2.5", !n.readAt && "bg-primary/5")}
                >
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug whitespace-normal" dir="auto">
                      {describe(n).message}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {format.relativeTime(new Date(n.createdAt))}
                    </span>
                  </span>
                  {!n.readAt && (
                    <span aria-label={t("unread")} className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
