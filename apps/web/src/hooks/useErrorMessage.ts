"use client";

import { useTranslations } from "next-intl";
import { isAppError } from "@madrasty/core";

/**
 * Turns an i18n key coming from the service layer / zod (e.g. "errors.conflict",
 * "validation.email") into user-facing text.
 */
export function useErrorMessage() {
  const t = useTranslations();

  return (keyOrError: unknown): string => {
    const key = isAppError(keyOrError)
      ? keyOrError.message
      : typeof keyOrError === "string"
        ? keyOrError
        : "errors.unknown";
    return t.has(key as never) ? t(key as never) : t("errors.unknown");
  };
}
