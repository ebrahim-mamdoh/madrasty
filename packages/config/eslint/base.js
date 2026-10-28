import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

/** Shared rules for every TypeScript package in the monorepo. */
export const baseConfig = tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/*.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "import-x": importX },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      // npm workspaces hoist everything to the root node_modules, so an import of a package
      // that is not declared in the nearest package.json would still "work". Forbid it.
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.test.{ts,tsx}",
            "**/*.config.{js,mjs,ts}",
            "**/eslint.config.{js,mjs}",
          ],
          includeTypes: true,
        },
      ],
    },
  },
  prettier,
);

export default baseConfig;
