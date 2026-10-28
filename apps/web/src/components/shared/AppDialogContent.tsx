"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { DialogClose, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * DialogContent with a localized close button placed with logical properties.
 * shadcn's built-in one has a hardcoded English "Close" label and uses `right-4`,
 * which overlaps the title in RTL.
 */
export function AppDialogContent({
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof DialogContent>, "showCloseButton">) {
  const t = useTranslations("common");

  return (
    <DialogContent showCloseButton={false} className={cn("pe-12", className)} {...props}>
      {children}
      <DialogClose
        aria-label={t("close")}
        className="absolute end-4 top-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:size-4"
      >
        <XIcon aria-hidden />
      </DialogClose>
    </DialogContent>
  );
}
