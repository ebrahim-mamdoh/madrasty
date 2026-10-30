"use client";

import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_META: Record<Locale, { native: string; flag: string; script: "ltr" | "rtl" }> = {
  ar: { native: "العربية", flag: "🇸🇦", script: "rtl" },
  en: { native: "English", flag: "🇬🇧", script: "ltr" },
  ru: { native: "Русский", flag: "🇷🇺", script: "ltr" },
  zh: { native: "中文", flag: "🇨🇳", script: "ltr" },
};

export type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
      toast.success(t("saved"));
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className={cn("gap-2", className)}
          aria-label={t("switcher_label")}
        >
          <Globe aria-hidden className="size-4" />
          <span className="hidden sm:inline">{LOCALE_META[locale]?.native || t("switcher_label")}</span>
          <span className="sm:hidden">{LOCALE_META[locale]?.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {(routing.locales as readonly Locale[]).map((loc) => {
          const meta = LOCALE_META[loc];
          const isActive = loc === locale;
          return (
            <DropdownMenuItem
              key={loc}
              disabled={isPending}
              onClick={() => switchLocale(loc)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>{meta.flag}</span>
                <span className="font-medium">{meta.native}</span>
              </span>
              {isActive && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/language" className="w-full text-xs text-muted-foreground cursor-pointer">
            {t("all_settings")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
