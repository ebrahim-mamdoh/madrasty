"use client";

import { PanelRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type SidebarToggleProps = {
  className?: string;
};

/** Localized replacement for shadcn's SidebarTrigger (its screen-reader label is hardcoded English). */
export function SidebarToggle({ className }: SidebarToggleProps) {
  const t = useTranslations("common");
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      aria-label={t("toggle_sidebar")}
      onClick={toggleSidebar}
    >
      <PanelRight aria-hidden className="ltr:-scale-x-100" />
    </Button>
  );
}
