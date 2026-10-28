import {
  AppError,
  pageRange,
  toPaginated,
  type FeatureKey,
  type PageParams,
  type Paginated,
  type PlatformStats,
  type School,
  type SchoolAdmin,
  type SchoolListItem,
  type SchoolSettingsInput,
  type SchoolStatus,
  type UpdateSchoolInput,
} from "@madrasty/core";
import { STORAGE_BUCKETS, type TypedSupabaseClient } from "../client";
import { toAppError, unwrap } from "../errors";
import { SCHOOL_COLUMNS, toFeatureKeys, toSchool, toSchoolListItem } from "../mappers";

export type SchoolsListParams = PageParams & {
  search?: string;
  status?: SchoolStatus;
};

/** Escapes LIKE wildcards so user input is matched literally. */
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function createSchoolsService(client: TypedSupabaseClient) {
  return {
    async list(params: SchoolsListParams): Promise<Paginated<SchoolListItem>> {
      const { from, to } = pageRange(params);
      let query = client
        .from("schools_overview")
        .select("id, name, slug, status, created_at, students_count, teachers_count", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .range(from, to);

      const search = params.search?.trim();
      if (search) query = query.ilike("name", likePattern(search));
      if (params.status) query = query.eq("status", params.status);

      const { data, count, error } = await query;
      const rows = unwrap({ data, error });
      return toPaginated(rows.map(toSchoolListItem), count ?? 0, params);
    },

    async getById(id: string): Promise<School & { features: FeatureKey[] }> {
      const [row, features] = await Promise.all([
        client.from("schools").select(SCHOOL_COLUMNS).eq("id", id).single().then(unwrap),
        client.from("school_features").select("feature_key").eq("school_id", id).then(unwrap),
      ]);
      return { ...toSchool(client, row), features: toFeatureKeys(features) };
    },

    async create(input: { name: string; slug: string; features: FeatureKey[] }): Promise<string> {
      const { id } = unwrap(
        await client
          .from("schools")
          .insert({ name: input.name, slug: input.slug })
          .select("id")
          .single(),
      );
      if (input.features.length > 0) {
        unwrap(
          await client.rpc("set_school_features", { p_school_id: id, p_features: input.features }),
        );
      }
      return id;
    },

    async remove(id: string): Promise<void> {
      unwrap(await client.from("schools").delete().eq("id", id));
    },

    async setStatus(id: string, status: SchoolStatus): Promise<void> {
      unwrap(await client.from("schools").update({ status }).eq("id", id));
    },

    async setFeatures(schoolId: string, features: FeatureKey[]): Promise<void> {
      unwrap(
        await client.rpc("set_school_features", { p_school_id: schoolId, p_features: features }),
      );
    },

    /**
     * The caller's own school (Admin → Settings). The RPC checks settings.branding; storage
     * policies only accept writes to `{school_id}/…` by holders of the same permission.
     * A replaced or removed logo file is deleted afterwards so the bucket doesn't keep orphans.
     */
    async updateOwnSettings(
      schoolId: string,
      input: SchoolSettingsInput,
      logo?: { file: Blob; extension: string } | "remove",
    ): Promise<void> {
      const bucket = client.storage.from(STORAGE_BUCKETS.schoolBranding);
      const { logo_path: previousPath } = unwrap(
        await client.from("schools").select("logo_path").eq("id", schoolId).single(),
      );

      let logoPath: string | undefined;
      if (logo && logo !== "remove") {
        logoPath = `${schoolId}/logo-${Date.now()}.${logo.extension}`;
        const { error } = await bucket.upload(logoPath, logo.file, {
          contentType: logo.file.type,
          upsert: false,
          cacheControl: "31536000",
        });
        if (error) throw toAppError(error);
      }

      try {
        unwrap(
          await client.rpc("update_school_settings", {
            p_name: input.name,
            p_primary_color: input.primaryColor,
            p_secondary_color: input.secondaryColor,
            p_timezone: input.timezone,
            // Omitted → SQL default (keeps the current logo).
            p_logo_path: logoPath,
            p_remove_logo: logo === "remove",
          }),
        );
      } catch (error) {
        if (logoPath) await bucket.remove([logoPath]);
        throw error;
      }

      if (previousPath && logo) await bucket.remove([previousPath]);
    },

    /** Super Admin: rename a school. RLS limits updates to the platform owner. */
    async update(id: string, input: UpdateSchoolInput): Promise<void> {
      const rows = unwrap(
        await client.from("schools").update({ name: input.name }).eq("id", id).select("id"),
      );
      if (rows.length === 0) throw new AppError("not_found");
    },

    /** Super Admin: the admin accounts of a school. */
    async listAdmins(schoolId: string): Promise<SchoolAdmin[]> {
      const rows = unwrap(
        await client
          .from("profiles")
          .select("id, full_name, email, is_active")
          .eq("school_id", schoolId)
          .eq("role", "school_admin")
          .order("full_name"),
      );
      return rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        isActive: row.is_active,
      }));
    },

    async platformStats(): Promise<PlatformStats> {
      const rows = unwrap(await client.rpc("platform_stats"));
      const row = rows[0];
      return {
        schoolsTotal: Number(row?.schools_total ?? 0),
        schoolsActive: Number(row?.schools_active ?? 0),
        studentsTotal: Number(row?.students_total ?? 0),
        teachersTotal: Number(row?.teachers_total ?? 0),
      };
    },
  };
}

export type SchoolsService = ReturnType<typeof createSchoolsService>;
