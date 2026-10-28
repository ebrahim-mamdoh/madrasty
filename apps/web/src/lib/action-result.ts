import { AppError } from "@madrasty/core";
import type { ActionResult } from "@/lib/actions";

/**
 * Client side of a server action: turns a failed ActionResult back into the AppError the
 * server produced, so React Query `onError` and form field errors work the same as for services.
 */
export async function unwrapAction<T>(pending: Promise<ActionResult<T>>): Promise<T> {
  const result = await pending;
  if (!result.ok) {
    throw new AppError(result.error.code, result.error.message, result.error.fieldErrors);
  }
  return result.data;
}
