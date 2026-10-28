import { baseConfig } from "./base.js";

/**
 * Restrictions that encode PROJECT_DNA rules for the web app.
 * `eslint-config-next` itself is composed in apps/web/eslint.config.mjs (it must resolve from the app).
 */
export const nextRestrictions = [
  ...baseConfig,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "Talk to Supabase only through @madrasty/api services.",
              allowTypeImports: true,
            },
            {
              name: "next/link",
              message: "Use Link from @/i18n/navigation (locale-aware).",
            },
          ],
          patterns: [
            {
              group: ["../*", "../../*"],
              message: "Use the @/ alias instead of relative parent imports.",
            },
          ],
        },
      ],
    },
  },
];

export default nextRestrictions;
