import { AppError } from "@madrasty/core";

type BackendError = {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
};

/** Postgres/PostgREST code → [AppError code, i18n message key]. */
const POSTGRES_CODES: Record<string, [AppError["code"], string?]> = {
  "42501": ["forbidden"], // insufficient_privilege / RLS violation
  "23505": ["conflict"], // unique_violation
  "23503": ["conflict", "errors.in_use"], // foreign_key_violation: row still referenced
  "23514": ["validation"], // check_violation
  "22P02": ["validation"], // invalid_text_representation (bad uuid…)
  P0002: ["not_found"], // raised by RPCs for unknown ids
  PGRST116: ["not_found"], // .single() returned no rows (also: RLS hid the row)
  PGRST301: ["unauthenticated"], // JWT expired / invalid
};

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "errors.invalid_credentials",
  email_exists: "errors.email_exists",
  user_already_exists: "errors.email_exists",
  over_request_rate_limit: "errors.rate_limited",
  weak_password: "errors.weak_password",
};

/** Translates any Supabase/PostgREST/Auth error into an AppError. Never leaks backend messages to the UI. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const e = (error ?? {}) as BackendError;

  if (e.name === "AuthApiError" || e.name === "AuthWeakPasswordError") {
    // Deactivation shows up as our hook's refusal or as GoTrue's ban (see admin users.setActive).
    if (
      e.message === "account_disabled" ||
      e.code === "account_disabled" ||
      e.code === "user_banned"
    ) {
      return new AppError("forbidden", "errors.account_disabled");
    }
    const key = e.code ? AUTH_MESSAGES[e.code] : undefined;
    if (key) return new AppError(e.status === 429 ? "rate_limited" : "validation", key);
    if (e.status === 429) return new AppError("rate_limited");
    if (e.status === 401) return new AppError("unauthenticated");
    if (e.status === 403) return new AppError("forbidden");
  }

  const mapped = e.code ? POSTGRES_CODES[e.code] : undefined;
  if (mapped) {
    return new AppError(mapped[0], mapped[1]);
  }

  if (e.name === "AuthRetryableFetchError" || e.message?.includes("fetch")) {
    return new AppError("network");
  }

  return new AppError("unknown");
}

/** Unwraps a `{ data, error }` response, throwing an AppError on failure. */
export function unwrap<R extends { data: unknown; error: unknown }>(
  response: R,
): Exclude<R["data"], null> {
  if (response.error) throw toAppError(response.error);
  // Supabase only returns `data: null` without an error for void RPCs / head requests.
  return response.data as Exclude<R["data"], null>;
}
