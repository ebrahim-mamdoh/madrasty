import {
  AppError,
  isAppRole,
  isPermissionKey,
  type AppRole,
  type LoginInput,
  type SessionContext,
} from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { toAppError, unwrap } from "../errors";
import { PROFILE_COLUMNS, SCHOOL_COLUMNS, toFeatureKeys, toProfile, toSchool } from "../mappers";

export type SessionClaims = {
  userId: string;
  role: AppRole | null;
  schoolId: string | null;
};

export function createSessionService(client: TypedSupabaseClient) {
  /**
   * Verified claims of the current user, or null when signed out.
   * `getClaims` validates the JWT signature, so it is safe to trust on the server.
   */
  async function getClaims(): Promise<SessionClaims | null> {
    const { data, error } = await client.auth.getClaims();
    if (error || !data?.claims.sub) return null;
    const {
      sub,
      user_role: role,
      school_id: schoolId,
    } = data.claims as {
      sub: string;
      user_role?: unknown;
      school_id?: unknown;
    };
    return {
      userId: sub,
      role: isAppRole(role) ? role : null,
      schoolId: typeof schoolId === "string" ? schoolId : null,
    };
  }

  return {
    getClaims,

    async signIn(input: LoginInput): Promise<void> {
      const { error } = await client.auth.signInWithPassword(input);
      if (error) throw toAppError(error);
    },

    async signOut(): Promise<void> {
      const { error } = await client.auth.signOut();
      if (error) throw toAppError(error);
    },

    /** Everything a portal needs about the signed-in user, fetched in parallel. */
    async getContext(): Promise<SessionContext | null> {
      const claims = await getClaims();
      if (!claims?.role) return null;

      const [profileRow, permissions, school, features] = await Promise.all([
        client
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", claims.userId)
          .single()
          .then(unwrap),
        client.rpc("my_permissions").then(unwrap),
        claims.schoolId
          ? client
              .from("schools")
              .select(SCHOOL_COLUMNS)
              .eq("id", claims.schoolId)
              .single()
              .then(unwrap)
          : Promise.resolve(null),
        claims.schoolId
          ? client
              .from("school_features")
              .select("feature_key")
              .eq("school_id", claims.schoolId)
              .then(unwrap)
          : Promise.resolve([]),
      ]);

      const profile = toProfile(profileRow);
      if (!profile.isActive) throw new AppError("forbidden", "errors.account_disabled");

      return {
        profile,
        school: school ? toSchool(client, school) : null,
        permissions: (permissions ?? []).filter(isPermissionKey),
        features: toFeatureKeys(features),
      };
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
