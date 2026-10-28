# Setup — Supabase project `ncwzztrihirzrtyjpwta`

One-time steps to connect the code to the cloud project. Do them in order.

## 1. Environment keys

Copy `apps/web/.env.example` → `apps/web/.env.local` (already created) and fill in from
**Dashboard → Project Settings → API Keys**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` — server only, never commit, never share |

`.env.local` is git-ignored.

## 1b. Supabase MCP (lets Claude apply migrations, run advisors, read logs)

`.mcp.json` holds no secrets — it reads the token from an environment variable.

1. Supabase Dashboard → **Account → Access Tokens** → generate a token.
2. Store it as a Windows user environment variable (PowerShell):

   ```powershell
   [Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', '<token>', 'User')
   ```

3. Fully quit and reopen the Claude app so it picks up the variable, then approve the
   `supabase` server when prompted.

The server is pinned to `project_ref=ncwzztrihirzrtyjpwta`. Never put a token literally in
`.mcp.json`; for a future production project add `&read_only=true` to the URL.

## 2. Apply the database migrations

```bash
npx supabase login
npm run db:link      # asks for the database password
npm run db:push      # applies supabase/migrations/*
npm run db:test      # runs the RLS tests against the linked DB (optional but recommended)
npm run db:types     # regenerates typed DB definitions
```

## 3. Auth settings in the Dashboard

`supabase/config.toml` only configures local dev, so mirror these on the cloud project:

1. **Authentication → Hooks → Customize Access Token (JWT) Claims** → enable, choose
   Postgres function `public.custom_access_token_hook`.
   _Without it, nobody has a role in their token and every portal is empty._
2. **Authentication → Sign In / Providers → Email** → turn **off** "Allow new users to sign up".
3. **Authentication → Policies (password)** → minimum length 8, require letters and digits.
4. **Project Settings → JWT Keys** → make sure an asymmetric signing key (ECC/RSA) is active so
   `getClaims()` verifies tokens locally instead of a network call.

## 4. Create the platform owner (Super Admin)

1. **Authentication → Users → Add user** (email + password, auto-confirm).
2. **SQL Editor**:

   ```sql
   select private.bootstrap_super_admin('owner@example.com', 'Owner Name');
   ```

3. Sign in at http://localhost:3000/login → you land on `/platform`, where you can create schools
   (each school is created together with its School Admin account).
