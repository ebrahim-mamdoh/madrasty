"use client";

import { ArrowLeft, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** Native name and flag for each locale, shown regardless of the UI language. */
const LOCALE_META: Record<Locale, { native: string; flag: string; script: "ltr" | "rtl" }> = {
  ar: { native: "العربية", flag: "🇸🇦", script: "rtl" },
  en: { native: "English", flag: "🇬🇧", script: "ltr" },
  ru: { native: "Русский", flag: "🇷🇺", script: "ltr" },
  zh: { native: "中文", flag: "🇨🇳", script: "ltr" },
};

export function LanguagePageClient() {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
      toast.success(t("saved"));
    });
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/login");
    }
  }

  return (
    <>
      <PageHeader
        title={t("page_title")}
        description={t("page_subtitle")}
        actions={
          <Button variant="outline" size="sm" onClick={handleBack} className="gap-2">
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t("back")}
          </Button>
        }
      />

      <div className="max-w-xl space-y-6">
        {/* Current language badge */}
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{t("current")}: </span>
          <span className="font-semibold text-primary">
            {LOCALE_META[locale].flag} {LOCALE_META[locale].native}
          </span>
        </div>

        {/* Language grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(routing.locales as readonly Locale[]).map((loc) => {
            const meta = LOCALE_META[loc];
            const isActive = loc === locale;

            return (
              <button
                key={loc}
                dir={meta.script}
                disabled={isPending}
                onClick={() => switchTo(loc)}
                aria-pressed={isActive}
                className={cn(
                  "group relative flex items-center gap-4 rounded-xl border p-4 text-start transition-all duration-200",
                  "hover:border-primary/60 hover:bg-primary/5 hover:shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-wait disabled:opacity-60",
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "bg-card",
                )}
              >
                {/* Flag */}
                <span className="text-3xl leading-none" aria-hidden>
                  {meta.flag}
                </span>

                {/* Names */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{meta.native}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t(`langs.${loc}`)}</p>
                </div>

                {/* Active check */}
                {isActive && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          {/* Brief note: language preference is stored in the URL prefix and the browser. */}
          {locale === "ar"
            ? "تُحفظ اللغة في عنوان الصفحة وتُطبَّق فورًا على جميع البوابات."
            : locale === "ru"
              ? "Язык сохраняется в URL и применяется немедленно ко всем порталам."
              : locale === "zh"
                ? "语言设置保存在页面地址中，立即应用于所有门户。"
                : "Language is saved in the page URL and applied instantly across all portals."}
        </p>
      </div>
    </>
  );
}
