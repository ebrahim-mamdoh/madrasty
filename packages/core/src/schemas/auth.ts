import { z } from "zod";

/**
 * Messages are i18n keys resolved by the UI (`t(issue.message)`), so the same schema
 * works on web and mobile without passing a translator in.
 */
export const loginSchema = z.object({
  email: z.email("validation.email").trim().toLowerCase(),
  password: z.string().min(1, "validation.required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const PASSWORD_MIN_LENGTH = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "validation.password_min")
  .max(72, "validation.password_max")
  .regex(/[a-zA-Z]/, "validation.password_letter")
  .regex(/\d/, "validation.password_digit");
