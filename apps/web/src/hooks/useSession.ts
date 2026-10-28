"use client";

import { use } from "react";
import type { FeatureKey, PermissionKey, SessionContext } from "@madrasty/core";
import { SessionReactContext } from "@/components/shared/SessionProvider";

export function useSession(): SessionContext {
  const session = use(SessionReactContext);
  if (!session) throw new Error("useSession must be used inside a portal layout");
  return session;
}

/**
 * UI-level permission check (hide/disable actions). Security is enforced by RLS and
 * server guards — this only keeps the interface honest.
 */
export function usePermission(permission: PermissionKey): boolean {
  return useSession().permissions.includes(permission);
}

/** School portals always run inside a school; fail loudly if that assumption breaks. */
export function useSchoolId(): string {
  const { school } = useSession();
  if (!school) throw new Error("This hook requires a school session");
  return school.id;
}

export function useFeature(feature: FeatureKey): boolean {
  return useSession().features.includes(feature);
}
