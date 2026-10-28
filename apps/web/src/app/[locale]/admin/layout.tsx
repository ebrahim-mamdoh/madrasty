import { AppShell } from "@/components/shared/AppShell";
import { requirePortal } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const session = await requirePortal("admin");
  return (
    <AppShell portal="admin" session={session}>
      {children}
    </AppShell>
  );
}
