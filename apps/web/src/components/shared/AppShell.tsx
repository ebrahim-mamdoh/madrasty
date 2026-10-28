import type { ReactNode } from "react";
import type { Portal, SessionContext } from "@madrasty/core";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { SessionProvider } from "@/components/shared/SessionProvider";
import { SidebarToggle } from "@/components/shared/SidebarToggle";
import { UserMenu } from "@/components/shared/UserMenu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export type AppShellProps = {
  portal: Portal;
  session: SessionContext;
  children: ReactNode;
};

/** Shared frame for every portal: sidebar + header + content, with the session hydrated. */
export function AppShell({ portal, session, children }: AppShellProps) {
  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <AppSidebar portal={portal} />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarToggle className="-ms-1" />
            <Separator orientation="vertical" className="h-5" />
            <div className="ms-auto flex items-center gap-1">
              {/* School portals only: the platform owner has no school inbox. */}
              {portal !== "platform" && <NotificationBell portal={portal} />}
              <LocaleSwitcher />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
