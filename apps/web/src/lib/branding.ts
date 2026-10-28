import type { CSSProperties } from "react";
import { DEFAULT_BRAND, readableForeground, type SchoolBranding } from "@madrasty/core";

/**
 * CSS variables that re-skin the whole UI for a school. Applied on <html>, so portalled
 * content (dialogs, menus) is branded too. Foregrounds are chosen for WCAG contrast.
 */
export function brandStyle(branding: SchoolBranding | null | undefined): CSSProperties {
  const primary = branding?.primaryColor ?? DEFAULT_BRAND.primary;
  const accent = branding?.secondaryColor ?? DEFAULT_BRAND.secondary;

  return {
    "--brand": primary,
    "--brand-foreground": readableForeground(primary),
    "--brand-accent": accent,
    "--brand-accent-foreground": readableForeground(accent),
  } as CSSProperties;
}
