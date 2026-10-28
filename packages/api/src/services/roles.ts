import {
  AppError,
  isPermissionKey,
  type PersonAccess,
  type PersonAccessInput,
  type StaffRole,
  type StaffRoleInput,
} from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { toAppError, unwrap } from "../errors";

/** Inserts `wanted − current` and deletes `current − wanted`; returns nothing when already equal. */
function diff<T>(current: T[], wanted: T[]) {
  const wantedSet = new Set(wanted);
  const currentSet = new Set(current);
  return {
    add: wanted.filter((item) => !currentSet.has(item)),
    remove: current.filter((item) => !wantedSet.has(item)),
  };
}

/** School-defined roles and per-person grants. RLS requires roles.manage for every write. */
export function createRolesService(client: TypedSupabaseClient) {
  async function setRolePermissions(schoolId: string, roleId: string, permissions: string[]) {
    const current = unwrap(
      await client.from("staff_role_permissions").select("permission_key").eq("role_id", roleId),
    ).map((row) => row.permission_key);
    const { add, remove } = diff(current, permissions);
    if (remove.length > 0) {
      unwrap(
        await client
          .from("staff_role_permissions")
          .delete()
          .eq("role_id", roleId)
          .in("permission_key", remove),
      );
    }
    if (add.length > 0) {
      unwrap(
        await client
          .from("staff_role_permissions")
          .insert(
            add.map((key) => ({ school_id: schoolId, role_id: roleId, permission_key: key })),
          ),
      );
    }
  }

  return {
    async listRoles(): Promise<StaffRole[]> {
      const rows = unwrap(
        await client
          .from("staff_roles")
          .select("id, name, staff_role_permissions(permission_key), profile_staff_roles(count)")
          .order("name"),
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        permissions: row.staff_role_permissions
          .map((p) => p.permission_key)
          .filter(isPermissionKey),
        membersCount: row.profile_staff_roles[0]?.count ?? 0,
      }));
    },

    async createRole(schoolId: string, input: StaffRoleInput): Promise<string> {
      let id: string;
      try {
        ({ id } = unwrap(
          await client
            .from("staff_roles")
            .insert({ school_id: schoolId, name: input.name })
            .select("id")
            .single(),
        ));
      } catch (error) {
        throw nameConflict(error);
      }
      await setRolePermissions(schoolId, id, input.permissions);
      return id;
    },

    async updateRole(schoolId: string, roleId: string, input: StaffRoleInput): Promise<void> {
      try {
        const rows = unwrap(
          await client
            .from("staff_roles")
            .update({ name: input.name })
            .eq("id", roleId)
            .select("id"),
        );
        if (rows.length === 0) throw new AppError("not_found");
      } catch (error) {
        throw nameConflict(error);
      }
      await setRolePermissions(schoolId, roleId, input.permissions);
    },

    /** Removing a role also removes it from everyone who had it (cascade). */
    async deleteRole(roleId: string): Promise<void> {
      const rows = unwrap(await client.from("staff_roles").delete().eq("id", roleId).select("id"));
      if (rows.length === 0) throw new AppError("not_found");
    },

    /** Staff and teachers with their role groups and individual permissions. */
    async listPeopleAccess(): Promise<PersonAccess[]> {
      const rows = unwrap(
        await client
          .from("profiles")
          .select(
            "id, full_name, role, profile_staff_roles(role_id), profile_permissions(permission_key)",
          )
          .in("role", ["staff", "teacher"])
          .eq("is_active", true)
          .order("full_name"),
      );
      return rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        role: row.role === "staff" ? "staff" : "teacher",
        roleIds: row.profile_staff_roles.map((r) => r.role_id),
        permissions: row.profile_permissions.map((p) => p.permission_key).filter(isPermissionKey),
      }));
    },

    /** Makes a person's roles and individual permissions exactly `input`. */
    async setPersonAccess(
      schoolId: string,
      profileId: string,
      input: PersonAccessInput,
    ): Promise<void> {
      const [currentRoles, currentPerms] = await Promise.all([
        client
          .from("profile_staff_roles")
          .select("role_id")
          .eq("profile_id", profileId)
          .then(unwrap),
        client
          .from("profile_permissions")
          .select("permission_key")
          .eq("profile_id", profileId)
          .then(unwrap),
      ]);

      const roles = diff(
        currentRoles.map((r) => r.role_id),
        input.roleIds,
      );
      const perms = diff(
        currentPerms.map((p) => p.permission_key),
        input.permissions,
      );

      if (roles.remove.length > 0) {
        unwrap(
          await client
            .from("profile_staff_roles")
            .delete()
            .eq("profile_id", profileId)
            .in("role_id", roles.remove),
        );
      }
      if (roles.add.length > 0) {
        unwrap(
          await client
            .from("profile_staff_roles")
            .insert(
              roles.add.map((roleId) => ({
                school_id: schoolId,
                profile_id: profileId,
                role_id: roleId,
              })),
            ),
        );
      }
      if (perms.remove.length > 0) {
        unwrap(
          await client
            .from("profile_permissions")
            .delete()
            .eq("profile_id", profileId)
            .in("permission_key", perms.remove),
        );
      }
      if (perms.add.length > 0) {
        unwrap(
          await client
            .from("profile_permissions")
            .insert(
              perms.add.map((key) => ({
                school_id: schoolId,
                profile_id: profileId,
                permission_key: key,
              })),
            ),
        );
      }
    },
  };
}

function nameConflict(error: unknown): AppError {
  const appError = toAppError(error);
  return appError.code === "conflict" && appError.message === "errors.conflict"
    ? new AppError("conflict", "errors.name_taken", { name: "errors.name_taken" })
    : appError;
}

export type RolesService = ReturnType<typeof createRolesService>;
