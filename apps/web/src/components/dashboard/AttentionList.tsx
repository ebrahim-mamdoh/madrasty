import { ChevronLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type AttentionItem = {
  key: string;
  icon: LucideIcon;
  label: ReactNode;
  href?: string;
  /** Highlights things that need action now. */
  urgent?: boolean;
};

/** "What needs attention" rows shared by the dashboards. */
export function AttentionList({ items, empty }: { items: AttentionItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y">
      {items.map(({ key, icon: Icon, label, href, urgent }) => {
        const content = (
          <>
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg",
                urgent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
              )}
            >
              <Icon aria-hidden className="size-4" />
            </span>
            <span className="min-w-0 flex-1 text-sm">{label}</span>
            {href && <ChevronLeft aria-hidden className="size-4 shrink-0 text-muted-foreground ltr:rotate-180" />}
          </>
        );
        return (
          <li key={key}>
            {href ? (
              <Link href={href} className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted">
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-2 py-2.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
