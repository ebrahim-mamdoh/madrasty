import "server-only";
import type { z } from "zod";
import { AppError, type AppErrorCode } from "@madrasty/core";
import { toAppError } from "@madrasty/api";

export type ActionError = {
  code: AppErrorCode;
  /** i18n key */
  message: string;
  /** field path → i18n key */
  fieldErrors?: Record<string, string>;
};

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: ActionError };

/** Validates untrusted input. Server actions never trust client-side validation. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    fieldErrors[issue.path.join(".")] ??= issue.message;
  }
  throw new AppError("validation", "errors.validation", fieldErrors);
}

/** Runs a server action body and converts any failure into a serializable ActionResult. */
export async function runAction<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (error) {
    const appError = toAppError(error);
    if (appError.code === "unknown") console.error("[action]", error);
    return {
      ok: false,
      error: {
        code: appError.code,
        message: appError.message,
        fieldErrors: appError.fieldErrors,
      },
    };
  }
}
