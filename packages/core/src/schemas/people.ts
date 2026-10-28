import { z } from "zod";
import { emailSchema, passwordSchema } from "./auth";

/** Roles a school manages from the admin portal (staff accounts come with the roles module). */
export const MANAGED_PERSON_ROLES = ["teacher", "student", "parent"] as const;
export type ManagedPersonRole = (typeof MANAGED_PERSON_ROLES)[number];

/** Optional phone: digits with an optional leading +, spaces and dashes allowed. */
const phoneSchema = z
  .string()
  .trim()
  .regex(/^$|^\+?[0-9][0-9\s-]{6,19}$/, "validation.phone");

const fullNameSchema = z
  .string()
  .trim()
  .min(2, "validation.name_min")
  .max(120, "validation.name_max");

const personBase = {
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
};

/** The fields every new account has, regardless of role (forms extend this). */
export const personAccountSchema = z.object(personBase);

/** Creating an account. Students may be placed in a class; parents may be linked to children. */
export const createPersonSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("teacher"), ...personBase }),
  z.object({
    role: z.literal("student"),
    ...personBase,
    /** Class in the current academic year; "" = not placed yet. */
    classId: z.union([z.uuid(), z.literal("")]),
  }),
  z.object({ role: z.literal("parent"), ...personBase, studentIds: z.array(z.uuid()) }),
]);

export type CreatePersonInput = z.infer<typeof createPersonSchema>;

/** Editable display fields (email and role are fixed after creation). */
export const updatePersonSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
});

export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;

export const resetPasswordSchema = z.object({ password: passwordSchema });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Readable temporary password: no ambiguous characters (0/O, 1/l/I), always letters + digits. */
export function generateTemporaryPassword(length = 12): string {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const random = new Uint32Array(length);
  // Web Crypto exists in browsers, Node 19+ and React Native (expo-crypto polyfill);
  // core has no DOM lib, so type just what we use.
  (
    globalThis as unknown as { crypto: { getRandomValues(array: Uint32Array): Uint32Array } }
  ).crypto.getRandomValues(random);
  const chars = Array.from(random, (n) => all[n % all.length]!);
  // Guarantee the password policy (letters + digits) regardless of the random draw.
  chars[0] = letters[random[0]! % letters.length]!;
  chars[length - 1] = digits[random[length - 1]! % digits.length]!;
  return chars.join("");
}
