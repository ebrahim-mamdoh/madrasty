import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { localeDirection, routing } from "@/i18n/routing";
import { getSession } from "@/lib/auth";
import { brandStyle } from "@/lib/branding";
import { ReactQueryProvider } from "@/lib/react-query";
import "@/app/globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "ar", namespace: "common" });
  return {
    title: { template: `%s · ${t("app_name")}`, default: t("app_name") },
    // Private, authenticated application — keep it out of search engines.
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // School branding is applied on <html> so dialogs and menus rendered in portals inherit it.
  const session = await getSession();

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      className={plexArabic.variable}
      style={brandStyle(session?.school?.branding)}
    >
      <body className="min-h-dvh font-sans">
        <NextIntlClientProvider>
          <ReactQueryProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster richColors position="top-center" />
            </TooltipProvider>
          </ReactQueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
