import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { nextRestrictions } from "@madrasty/config/eslint/next";

const config = [
  { ignores: [".next/**", "next-env.d.ts", "src/components/ui/**"] },
  ...nextVitals,
  ...nextTs,
  ...nextRestrictions,
  {
    // The Supabase client factories are the single sanctioned place to import supabase-js.
    files: ["src/lib/supabase/**"],
    rules: { "no-restricted-imports": "off" },
  },
];

export default config;
