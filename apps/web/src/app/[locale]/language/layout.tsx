import type { ReactNode } from "react";

/**
 * Minimal layout for the shared /language settings page.
 * Accessible from any portal and from the login page.
 * Renders without a sidebar as a focused settings screen.
 */
export default function LanguageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto w-full max-w-2xl flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
