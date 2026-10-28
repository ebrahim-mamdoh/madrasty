export const APP_ERROR_CODES = [
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "validation",
  "rate_limited",
  "network",
  "unknown",
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

/**
 * The only error shape the UI ever sees. Services translate backend errors into it,
 * so swapping the backend never changes error handling in screens.
 * `message` is an i18n key (e.g. "errors.conflict"), not user-facing text.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: AppErrorCode, message?: string, fieldErrors?: Record<string, string>) {
    super(message ?? `errors.${code}`);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
