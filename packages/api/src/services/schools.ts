import {
  pageRange,
  toPaginated,
  type BrandingInput,
  type FeatureKey,
  type PageParams,
  type Paginated,
  type PlatformStats,
  type School,
  type SchoolListItem,
  type SchoolStatus,
} from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { unwrap } from "../errors";
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

    async updateOwnBranding(input: BrandingInput & { logoPath?: string }): Promise<void> {
      unwrap(
        await client.rpc("update_school_branding", {
          p_primary_color: input.primaryColor,
          p_secondary_color: input.secondaryColor,
          // Omitted → SQL default (keeps the current logo).
          p_logo_path: input.logoPath,
        }),
      );
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
