"use client";

import { createContext, type ReactNode } from "react";
import type { SessionContext } from "@madrasty/core";

export const SessionReactContext = createContext<SessionContext | null>(null);

export type SessionProviderProps = {
  session: SessionContext;
  children: ReactNode;
};

/** Hydrates the server-resolved session into client components. Read it with `useSession()`. */
export function SessionProvider({ session, children }: SessionProviderProps) {
  return <SessionReactContext value={session}>{children}</SessionReactContext>;
}
