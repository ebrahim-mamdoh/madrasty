import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { isAppError } from "@madrasty/core";

/**
 * Puts field-level errors returned by a service/server action onto the matching inputs.
 * Returns true when at least one field error was applied (so the caller can skip a generic toast).
 */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
): boolean {
  if (!isAppError(error) || !error.fieldErrors) return false;

  let first = true;
  for (const [path, message] of Object.entries(error.fieldErrors)) {
    setError(path as FieldPath<T>, { message }, { shouldFocus: first });
    first = false;
  }
  return true;
}

/** True when the error was fully represented as field errors on the form. */
export function hasFieldErrors(error: unknown): boolean {
  return isAppError(error) && Boolean(error.fieldErrors);
}
