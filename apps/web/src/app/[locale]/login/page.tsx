import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandMark } from "@/components/shared/BrandMark";
import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { homeForRole } from "@/lib/portals";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("login") };
}

export default async function LoginPage() {
  const [session, locale, t] = await Promise.all([getSession(), getLocale(), getTranslations()]);
  const home = session ? homeForRole(session.profile.role) : null;
  if (home) redirect({ href: home, locale });

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] p-4">
      <LocaleSwitcher className="absolute end-4 top-4" />
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandMark name={t("common.app_name")} size="lg" />
          <p className="text-sm text-muted-foreground">{t("auth.tagline")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t("auth.title")}</CardTitle>
            <CardDescription>{t("auth.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
