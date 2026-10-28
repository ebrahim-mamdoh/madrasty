import {
  DEFAULT_BRAND,
  isFeatureKey,
  safeBrandColor,
  type Profile,
  type School,
  type SchoolListItem,
} from "@madrasty/core";
import { STORAGE_BUCKETS, type TypedSupabaseClient } from "./client";
import type { Tables } from "./database.types";

export const SCHOOL_COLUMNS =
  "id, name, slug, status, logo_path, primary_color, secondary_color, locale, timezone, study_days, created_at" as const;

export const PROFILE_COLUMNS = "id, school_id, role, full_name, email, phone, is_active" as const;

type SchoolRow = Pick<
  Tables<"schools">,
  | "id"
  | "name"
  | "slug"
  | "status"
  | "logo_path"
  | "primary_color"
  | "secondary_color"
  | "locale"
  | "timezone"
  | "study_days"
  | "created_at"
>;

type ProfileRow = Pick<
  Tables<"profiles">,
  "id" | "school_id" | "role" | "full_name" | "email" | "phone" | "is_active"
>;

export function publicLogoUrl(client: TypedSupabaseClient, path: string | null): string | null {
  if (!path) return null;
  return client.storage.from(STORAGE_BUCKETS.schoolBranding).getPublicUrl(path).data.publicUrl;
}

export function toSchool(client: TypedSupabaseClient, row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    locale: row.locale === "en" ? "en" : "ar",
    timezone: row.timezone,
    studyDays: row.study_days,
    createdAt: row.created_at,
    branding: {
      name: row.name,
      logoUrl: publicLogoUrl(client, row.logo_path),
      primaryColor: safeBrandColor(row.primary_color, DEFAULT_BRAND.primary),
      secondaryColor: safeBrandColor(row.secondary_color, DEFAULT_BRAND.secondary),
    },
  };
}

/** Postgres reports every view column as nullable; these come from NOT NULL table columns. */
function required<T>(value: T | null, column: string): T {
  if (value === null) throw new Error(`schools_overview.${column} is unexpectedly null`);
  return value;
}

export function toSchoolListItem(row: Tables<"schools_overview">): SchoolListItem {
  return {
    id: required(row.id, "id"),
    name: required(row.name, "name"),
    slug: required(row.slug, "slug"),
    status: required(row.status, "status"),
    createdAt: required(row.created_at, "created_at"),
    studentsCount: Number(row.students_count ?? 0),
    teachersCount: Number(row.teachers_count ?? 0),
  };
}

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    schoolId: row.school_id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    isActive: row.is_active,
  };
}

export function toFeatureKeys(rows: { feature_key: string }[]) {
  return rows.map((r) => r.feature_key).filter(isFeatureKey);
}
