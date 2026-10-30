import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en", "ru", "zh"],
  defaultLocale: "ar",
  // Arabic URLs stay clean (/admin); English/Russian/Chinese are prefixed (/en/admin, /ru/admin, /zh/admin).
  localePrefix: "as-needed",
  // Arabic-first: ignore the browser's Accept-Language; other locales are opt-in via the language page.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export function localeDirection(locale: string): "rtl" | "ltr" {
  // Only Arabic is RTL; English, Russian and Chinese are LTR.
  return locale === "ar" ? "rtl" : "ltr";
}
