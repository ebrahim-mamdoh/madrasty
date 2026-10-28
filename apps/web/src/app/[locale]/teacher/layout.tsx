import { AppShell } from "@/components/shared/AppShell";
import { requirePortal } from "@/lib/auth";

export default async function TeacherLayout({ children }: LayoutProps<"/[locale]/teacher">) {
  const session = await requirePortal("teacher");
  return (
    <AppShell portal="teacher" session={session}>
      {children}
    </AppShell>
  );
}
