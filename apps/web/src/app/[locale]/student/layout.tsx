import { AppShell } from "@/components/shared/AppShell";
import { requirePortal } from "@/lib/auth";

export default async function StudentLayout({ children }: LayoutProps<"/[locale]/student">) {
  const session = await requirePortal("student");
  return (
    <AppShell portal="student" session={session}>
      {children}
    </AppShell>
  );
}
