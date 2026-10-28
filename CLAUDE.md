# Madrasty

Multi-tenant school SaaS. Read before changing code:

- `docs/PROJECT_DNA.md` — architecture, conventions, anti-patterns (source of truth for how to build).
- Business specs (Arabic): `website-superAdmin-admin-student.md`, `supabase-backend.md`, `mopile-app.md`.

## Commands (run from repo root, npm workspaces)

- `npm run dev` — web app on http://localhost:3000
- `npm run typecheck` / `npm run lint` / `npm test` / `npm run build` — via Turborepo
- `npm run db:push` — apply `supabase/migrations` to the linked project
- `npm run db:types` — regenerate `packages/api/src/database.types.ts` after a migration
- `npm run db:test` — run pgTAP RLS tests in `supabase/tests`

## Non-negotiables

- Supabase is only touched inside `packages/api`. Never in components, hooks, pages or actions.
- Every schema change is a new migration file; every new table gets RLS + policies + a pgTAP test.
- Every user-visible string goes in `apps/web/src/messages/{ar,en}.json`. Arabic/RTL first.
- Server actions authorize on the server and validate input with the shared zod schema.
- Add a dependency to one workspace only: `npm install <pkg> -w @madrasty/web` (never at the root unless it's tooling).
- After `npx shadcn add …` (run in `apps/web`, answer "n" to overwrite prompts): the CLI rewrites imports to
  `from "cn"` and installs an unrelated npm package `cn`. Replace with `from "@/lib/utils"` and `npm uninstall cn -w @madrasty/web`.
