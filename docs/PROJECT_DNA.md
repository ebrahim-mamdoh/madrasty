# PROJECT_DNA.md — Madrasty (Next.js + Supabase monorepo)

> Engineering identity of this codebase: how it is built, structured, and extended.
> Business requirements live in the three spec files at the repo root
> (`website-superAdmin-admin-student.md`, `supabase-backend.md`, `mopile-app.md`).
> Conventions are adapted from the Q-hub admin DNA and tuned for Next.js App Router + Supabase.

---

## 1. Tech Stack

| Category | Choice | Why |
|----------|--------|-----|
| Monorepo | **npm workspaces + Turborepo** | Cached task graph, shared packages for the future mobile app; `import-x/no-extraneous-dependencies` enforces declared deps despite hoisting |
| Web framework | **Next.js 16 (App Router)** + React 19 | Server layer for privileged ops (account creation), RSC for fast first paint, per-portal route splitting |
| Language | **TypeScript 6 — strict** + `noUncheckedIndexedAccess` | |
| Backend | **Supabase** (Postgres, Auth, Storage) via `@supabase/ssr` | RLS-enforced multi-tenancy |
| Styling | **Tailwind CSS v4** — configured in `globals.css` via `@theme`, no `tailwind.config.ts` | |
| UI primitives | **shadcn/ui (`new-york`)** on Radix, `lucide-react` icons | |
| Server state | **TanStack Query v5** | Caching, dedup, background refresh |
| Client state | **Zustand v5** — small UI-only stores | Session/permissions come from the server, so global client state is tiny |
| Forms | **react-hook-form v7 + Zod v4** (`@hookform/resolvers`) | |
| Tables | **TanStack Table** | Headless, server pagination |
| i18n | **next-intl v4** — `defaultLocale: "ar"`, RTL first | |
| Charts | **Recharts** (via shadcn chart) | |
| Dates | **date-fns** only (one date lib) | |
| Toasts | **sonner** via `notifySuccess` / `notifyError` helpers | |
| Env validation | **@t3-oss/env-nextjs** | Fails the build on missing/invalid env |
| Testing | **Vitest** (units) · **pgTAP** (RLS policies, `supabase/tests`) | |

---

## 2. Repository Layout

```
madrasty/
├── apps/
│   └── web/                     # Next.js — Super Admin, School Admin, Teacher, Student portals
├── packages/
│   ├── config/                  # Shared tsconfig + eslint presets
│   ├── core/                    # Platform-agnostic domain: types, roles, permission & feature keys, zod schemas
│   └── api/                     # Service layer — the ONLY code that talks to Supabase
├── supabase/
│   ├── migrations/              # Versioned SQL — the single source of truth for the schema
│   ├── tests/                   # pgTAP tests for RLS and helper functions
│   ├── seed.sql
│   └── config.toml
└── docs/
```

Dependency direction (never reversed):

```
apps/web  ──►  @madrasty/api  ──►  @madrasty/core
    └──────────────────────────────►  @madrasty/core
```

`@madrasty/core` and `@madrasty/api` must never import from `next`, `react-dom`, or anything web-only —
the React Native parent app will consume them unchanged.

---

## 3. The Service Layer (`@madrasty/api`) — hard rule

**No Supabase call ever appears in a component, hook, page, or server action.**

```
Component → useClasses() (React Query hook) → services.classes.list() → Supabase
Server Component / Server Action → getServerServices() → services.x.y() → Supabase
```

- `createServices(client)` takes an injected, typed `SupabaseClient<Database>` and returns domain services
  (`services.schools`, `services.session`, …). Swapping the backend later = reimplementing this package.
- Services return **domain types** from `@madrasty/core` (camelCase), never raw rows. Mapping lives in the service.
- Errors are normalised into `AppError` (`code`, `message`, `fieldErrors?`). UI never inspects Postgres error codes.
- Privileged operations (create users, cross-tenant reads) live in `@madrasty/api/admin` and receive the
  **service-role** client. That entry point is imported only from files guarded by `import "server-only"`.

---

## 4. Multi-Tenancy & Security Model

1. **Every tenant table has `school_id uuid not null`** with a composite index leading on it.
2. **RLS is enabled on every table** in `public`. No table is left without policies.
3. **JWT claims**: a Custom Access Token Hook injects `school_id` and `user_role` into the access token, so
   policies read claims instead of joining `profiles` on every row.
4. Policy helpers live in the `private` schema (not exposed through the API), are `security definer`,
   `stable`, and pin `search_path = ''`. Policies call them wrapped in `(select …)` so Postgres caches the
   result per statement instead of per row.
5. **No public sign-up.** Accounts are created top-down: Super Admin → School + School Admin;
   School Admin → staff, teachers, students, parents. Creation runs in a Server Action using the service-role
   client; `role` + `school_id` are written to `app_metadata` (only the service role can write it), and a trigger
   creates the matching `profiles` row atomically.
6. **Permissions** = role defaults + school-defined staff roles (groups) + per-user grants.
   `school_admin` implicitly holds every permission inside their school. Checked in RLS (`private.has_permission`)
   **and** in the UI (to hide actions) — the UI check is UX, the RLS check is security.
7. The service-role key is server-only (`SUPABASE_SECRET_KEY`, no `NEXT_PUBLIC_` prefix), validated by `env.ts`.
8. Defense in depth on routes: `proxy.ts` refreshes the session and bounces anonymous users;
   each portal layout re-checks the role on the server (`requireRole`).
9. Security headers (CSP, HSTS, frame-ancestors, referrer-policy, permissions-policy) are set in `next.config.ts`.

---

## 5. Web App Structure (`apps/web/src`)

```
app/[locale]/
  layout.tsx                 ← <html lang dir>, font, providers
  (auth)/login/page.tsx
  platform/…                 ← Super Admin portal
  admin/…                    ← School Admin portal
  teacher/…                  ← Teacher workspace
  student/…                  ← Student portal
actions/{domain}.ts          ← Server Actions ("use server"): authorize → parseInput → service call → ActionResult
components/
  ui/        ← shadcn primitives — generated, do not edit
  shared/    ← zero domain knowledge, prop-driven (AppShell, StatCard, DataTable, PageHeader…)
  pages/     ← fat "*PageClient" containers, one per route
  auth/      ← login + auth field primitives
  {domain}/  ← feature components (schools/, classes/, attendance/…)
hooks/
  queries/{domain}/use{Resource}.ts  ← React Query hooks (the only place useQuery/useMutation appear)
  use{Name}.ts                        ← utility hooks
lib/
  supabase/  ← client factories (browser / server / admin / proxy session refresh)
  services.ts / services.server.ts   ← service-layer factories bound to the right client
  env.ts, utils.ts, react-query.tsx, branding.ts, auth.ts
stores/      ← Zustand stores (UI state only)
i18n/        ← next-intl routing, navigation, request config
messages/    ← ar.json, en.json
constants/   ← static data (navigation per portal…)
proxy.ts     ← session refresh + i18n + auth redirect
```

### Pages are thin
`app/**/page.tsx` is a server component (~25 lines): `generateMetadata`, server-side guard, render one
`components/pages/*PageClient`. No business logic.

### Components
- One component per file, PascalCase; `components/ui/*` stays lowercase (shadcn).
- Every component has an explicit `{Name}Props` type and accepts `className` merged via `cn()`.
- Extract a hook once a component has more than one effect or non-trivial derived state.

---

## 6. Design System & White-Labeling

- All colors are CSS variables on `:root` (`--primary`, `--background`, …) mapped into Tailwind via `@theme`.
  **No hex colors in TSX.**
- A school's brand (`primary_color`, `secondary_color`, logo, name) is loaded on the server in the portal layout
  and applied as inline CSS variables on the shell. Foreground colors are computed for WCAG contrast, so any
  brand color stays readable.
- Font: IBM Plex Sans Arabic via `next/font` (self-hosted, `display: swap`).
- RTL first: logical properties (`ms-*`, `pe-*`, `start-*`) instead of `ml/pr/left`; `rtl:` variant only when
  logical properties cannot express it.

---

## 7. State Management

| Data | Tool |
|------|------|
| Server data | React Query (client) / RSC + services (server) |
| Session, profile, school, permissions, features | Loaded on the server, provided via `SessionProvider` context |
| UI state shared across distant components (sidebar…) | Zustand |
| Forms | react-hook-form + zod |
| Filters / pagination | URL search params |
| Local ephemeral | `useState` |

---

## 8. Performance Rules

- Default to Server Components; `"use client"` only on interactive leaves and page containers.
- Every FK and every `school_id` filter is indexed; list queries are paginated server-side (`range`).
- Select only needed columns in services — never `select("*")` for lists.
- Exams: the question sheet is fetched once at start; answers are stored locally and submitted once in a single
  RPC (`submit_exam`) — no per-question writes.
- Heavy client widgets (charts, editors) are loaded with `next/dynamic`.
- `next/image` for all raster images with explicit sizes.

---

## 9. Code Style

| Thing | Convention | Example |
|-------|-----------|---------|
| Component files | PascalCase | `SchoolsTable.tsx` |
| Hook files | `use` prefix | `useSchools.ts` |
| Utility files | camelCase | `branding.ts` |
| Props | `{Component}Props` | `StatCardProps` |
| Zod schemas | camelCase + `Schema`, factory taking `t` when messages are shown | `createSchoolSchema(t)` |
| Query keys | exported `const` arrays per domain | `schoolsQueryKey` |
| SQL | snake_case; tables plural; FK `{entity}_id` | `class_subjects.teacher_id` |

- Imports: React → third-party → `@madrasty/*` → `@/…`. Always `@/` alias, no `../../`.
- No barrel files except package entry points (`@madrasty/core`, `@madrasty/api`).
- Navigation always via `@/i18n/navigation` (locale-aware), never `next/link` / `next/navigation` directly
  (except `notFound`, `redirect` in server code via the i18n helpers).
- Every user-visible string lives in `messages/ar.json` + `messages/en.json`.
- Toasts only via `notifySuccess` / `notifyError` from `@/lib/utils`.

---

## 10. Anti-Patterns

| Never | Instead |
|-------|---------|
| `supabase.from(...)` outside `packages/api` | Add a service method |
| Importing `@madrasty/api/admin` or `lib/supabase/admin.ts` without `server-only` | Keep privileged code server-only |
| A table without RLS, or a policy using `auth.uid()` unwrapped per row | `(select auth.uid())` / `(select private.fn())` |
| Trusting role/school sent from the client | Read them from the JWT / session on the server |
| `select("*")` in list queries | Name the columns |
| Hex colors / hardcoded strings in TSX | Tokens / message keys |
| `ml-*`, `pr-*`, `left-*` for layout | `ms-*`, `pe-*`, `start-*` |
| `useQuery` directly in a component | Named hook in `hooks/queries/` |
| Editing `components/ui/*` | Wrap or compose in `components/shared/` |
| Schema changes in the dashboard | A new migration file |
