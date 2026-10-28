import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  // Arabic URLs stay clean (/admin); English is prefixed (/en/admin).
  localePrefix: "as-needed",
  // Arabic-first: ignore the browser's Accept-Language; English is opt-in via the switcher.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export function localeDirection(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
