import { AppShell } from "@/components/shared/AppShell";
import { requirePortal } from "@/lib/auth";

export default async function PlatformLayout({ children }: LayoutProps<"/[locale]/platform">) {
  const session = await requirePortal("platform");
  return (
    <AppShell portal="platform" session={session}>
      {children}
    </AppShell>
  );
}
