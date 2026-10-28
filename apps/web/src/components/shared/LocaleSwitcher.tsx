"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      className={cn("gap-2", className)}
      onClick={() =>
        startTransition(() => router.replace(pathname, { locale: locale === "ar" ? "en" : "ar" }))
      }
    >
      <Languages aria-hidden className="size-4" />
      {t("switch_language")}
    </Button>
  );
}
