/** Brand colors are stored as `#rrggbb`. */
export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_BRAND = {
  primary: "#1f5fd6",
  secondary: "#f6b72c",
} as const;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a `#rrggbb` color. */
export function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/** Picks white or near-black text — whichever reads better on the given brand color. */
export function readableForeground(background: string): "#ffffff" | "#111827" {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#111827")
    ? "#ffffff"
    : "#111827";
}

export function safeBrandColor(value: string | null | undefined, fallback: string): string {
  return value && HEX_COLOR_REGEX.test(value) ? value.toLowerCase() : fallback;
}
