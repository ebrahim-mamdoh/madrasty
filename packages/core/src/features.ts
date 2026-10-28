/** Modules a school can have toggled on/off by its plan. Mirrors rows in `public.features`. */
export const FEATURE_KEYS = [
  "homework",
  "exams",
  "online_exams",
  "monthly_reports",
  "parent_app",
  "online_payments",
  "online_lectures",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === "string" && (FEATURE_KEYS as readonly string[]).includes(value);
}
