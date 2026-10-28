import { z } from "zod";
import { HEX_COLOR_REGEX } from "../branding";
import { FEATURE_KEYS } from "../features";
import { passwordSchema } from "./auth";

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

/** Super Admin → creates a school together with its first School Admin account. */
export const createSchoolSchema = z.object({
  name: z.string().trim().min(2, "validation.name_min").max(120, "validation.name_max"),
  slug: schoolSlugSchema,
  features: z.array(z.enum(FEATURE_KEYS)),
  admin: z.object({
    fullName: z.string().trim().min(2, "validation.name_min").max(120, "validation.name_max"),
    email: z.email("validation.email").trim().toLowerCase(),
    password: passwordSchema,
  }),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

export const updateSchoolFeaturesSchema = z.object({
  schoolId: z.uuid(),
  features: z.array(z.enum(FEATURE_KEYS)),
});

export type UpdateSchoolFeaturesInput = z.infer<typeof updateSchoolFeaturesSchema>;
