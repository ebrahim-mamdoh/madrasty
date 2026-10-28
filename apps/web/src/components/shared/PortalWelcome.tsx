import { getTranslations } from "next-intl/server";
import type { SessionContext } from "@madrasty/core";
import { ComingSoon } from "@/components/shared/ComingSoon";
import { PageHeader } from "@/components/shared/PageHeader";

export type PortalWelcomeProps = {
  session: SessionContext;
  subtitleKey: "admin_subtitle" | "teacher_subtitle" | "student_subtitle";
};

/** Portal landing header. Dashboards get real widgets as each module ships. */
export async function PortalWelcome({ session, subtitleKey }: PortalWelcomeProps) {
  const t = await getTranslations("dashboard");

  return (
    <>
      <PageHeader
        title={t("welcome", { name: session.profile.fullName })}
        description={t(subtitleKey)}
      />
      <ComingSoon />
    </>
  );
}
