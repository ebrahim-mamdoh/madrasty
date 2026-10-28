import { z } from "zod";
import { HEX_COLOR_REGEX } from "../branding";
import { FEATURE_KEYS } from "../features";
import { emailSchema, passwordSchema } from "./auth";

export const schoolSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "validation.slug_min")
  .max(40, "validation.slug_max")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "validation.slug_format");

export const brandingSchema = z.object({
  primaryColor: z.string().regex(HEX_COLOR_REGEX, "validation.color"),
  secondaryColor: z.string().regex(HEX_COLOR_REGEX, "validation.color"),
});

export type BrandingInput = z.infer<typeof brandingSchema>;

const schoolNameSchema = z
  .string()
  .trim()
  .min(2, "validation.name_min")
  .max(120, "validation.name_max");

/** What a school edits about itself (Admin → Settings). */
export const schoolSettingsSchema = brandingSchema.extend({
  name: schoolNameSchema,
  timezone: z.string().min(1, "validation.required"),
});

export type SchoolSettingsInput = z.infer<typeof schoolSettingsSchema>;

/** Accepted logo uploads (SVG is refused: it can carry scripts). */
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Super Admin → adds another admin to an existing school. */
export const addSchoolAdminSchema = z.object({
  fullName: z.string().trim().min(2, "validation.name_min").max(120, "validation.name_max"),
  email: emailSchema,
  password: passwordSchema,
});

export type AddSchoolAdminInput = z.infer<typeof addSchoolAdminSchema>;

/** Super Admin → edits a school's identity. */
export const updateSchoolSchema = z.object({ name: schoolNameSchema });

export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;

/** Super Admin → creates a school together with its first School Admin account. */
export const createSchoolSchema = z.object({
  name: z.string().trim().min(2, "validation.name_min").max(120, "validation.name_max"),
  slug: schoolSlugSchema,
  features: z.array(z.enum(FEATURE_KEYS)),
  admin: z.object({
    fullName: z.string().trim().min(2, "validation.name_min").max(120, "validation.name_max"),
    email: emailSchema,
    password: passwordSchema,
  }),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

export const updateSchoolFeaturesSchema = z.object({
  schoolId: z.uuid(),
  features: z.array(z.enum(FEATURE_KEYS)),
});

export type UpdateSchoolFeaturesInput = z.infer<typeof updateSchoolFeaturesSchema>;
