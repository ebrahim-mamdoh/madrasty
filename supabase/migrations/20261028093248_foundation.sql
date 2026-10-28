-- =====================================================================
-- Foundation: tenancy, profiles, roles & permissions, feature flags.
-- Conventions:
--   * Every tenant table carries school_id and is protected by RLS.
--   * Cross-table links inside a tenant use composite FKs (id, school_id)
--     so a row can never point at another school's data.
--   * Policy helpers live in the non-exposed `private` schema.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.app_role as enum (
  'super_admin',
  'school_admin',
  'staff',
  'teacher',
  'student',
  'parent'
);

create type public.school_status as enum ('active', 'suspended');

-- ---------------------------------------------------------------------
-- Generic triggers
-- ---------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Schools (tenants)
-- ---------------------------------------------------------------------
create table public.schools (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 2 and 120),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  status          public.school_status not null default 'active',
  logo_path       text,
  primary_color   text not null default '#1f5fd6' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text not null default '#f6b72c' check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  locale          text not null default 'ar' check (locale in ('ar', 'en')),
  timezone        text not null default 'UTC',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index schools_status_idx on public.schools (status);
create index schools_created_at_idx on public.schools (created_at desc);

create trigger schools_set_updated_at
before update on public.schools
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Feature flags (catalog is reference data, owned by migrations)
-- ---------------------------------------------------------------------
create table public.features (
  key        text primary key,
  sort_order int not null default 0
);

insert into public.features (key, sort_order) values
  ('homework', 10),
  ('exams', 20),
  ('online_exams', 30),
  ('monthly_reports', 40),
  ('parent_app', 50),
  ('online_payments', 60),
  ('online_lectures', 70);

create table public.school_features (
  school_id   uuid not null references public.schools (id) on delete cascade,
  feature_key text not null references public.features (key) on update cascade,
  enabled_at  timestamptz not null default now(),
  primary key (school_id, feature_key)
);

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  school_id   uuid references public.schools (id) on delete cascade,
  role        public.app_role not null,
  full_name   text not null check (char_length(full_name) between 2 and 120),
  email       text,
  phone       text,
  avatar_path text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Only the platform owner lives outside a school.
  constraint profiles_school_matches_role check ((role = 'super_admin') = (school_id is null)),
  constraint profiles_id_school_key unique (id, school_id)
);

create index profiles_school_role_idx on public.profiles (school_id, role);
create index profiles_school_name_idx on public.profiles (school_id, full_name);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Permissions: catalog + school-defined staff roles + direct grants
-- ---------------------------------------------------------------------
create table public.permissions (
  key    text primary key,
  module text not null
);

insert into public.permissions (key, module)
select k, split_part(k, '.', 1)
from unnest(array[
  'structure.view', 'structure.manage',
  'students.view', 'students.manage',
  'teachers.view', 'teachers.manage',
  'parents.view', 'parents.manage',
  'staff.view', 'staff.manage',
  'roles.manage',
  'attendance.view', 'attendance.record',
  'homework.view', 'homework.manage',
  'exams.view', 'exams.manage', 'exams.approve',
  'grades.view', 'grades.record', 'grades.edit',
  'reports.view', 'reports.send',
  'finance.view', 'finance.manage',
  'monitoring.view',
  'settings.branding'
]) as k;

create table public.staff_roles (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 60),
  created_at timestamptz not null default now(),
  constraint staff_roles_school_name_key unique (school_id, name),
  constraint staff_roles_id_school_key unique (id, school_id)
);

create table public.staff_role_permissions (
  school_id      uuid not null,
  role_id        uuid not null,
  permission_key text not null references public.permissions (key) on update cascade,
  primary key (role_id, permission_key),
  foreign key (role_id, school_id) references public.staff_roles (id, school_id) on delete cascade
);

create index staff_role_permissions_school_idx on public.staff_role_permissions (school_id);

create table public.profile_staff_roles (
  school_id  uuid not null,
  profile_id uuid not null,
  role_id    uuid not null,
  primary key (profile_id, role_id),
  foreign key (profile_id, school_id) references public.profiles (id, school_id) on delete cascade,
  foreign key (role_id, school_id) references public.staff_roles (id, school_id) on delete cascade
);

create index profile_staff_roles_role_idx on public.profile_staff_roles (role_id);
create index profile_staff_roles_school_idx on public.profile_staff_roles (school_id);

create table public.profile_permissions (
  school_id      uuid not null,
  profile_id     uuid not null,
  permission_key text not null references public.permissions (key) on update cascade,
  primary key (profile_id, permission_key),
  foreign key (profile_id, school_id) references public.profiles (id, school_id) on delete cascade
);

create index profile_permissions_school_idx on public.profile_permissions (school_id);

-- ---------------------------------------------------------------------
-- JWT-backed helpers (claims are injected by custom_access_token_hook)
-- ---------------------------------------------------------------------
create function private.jwt_school_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'school_id', '')::uuid;
$$;

create function private.jwt_role()
returns public.app_role
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'user_role', '')::public.app_role;
$$;

create function private.is_super_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(private.jwt_role() = 'super_admin', false);
$$;

/** Permission granted to the caller directly or through one of their staff roles. */
create function private.has_granted_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_permissions pp
    where pp.profile_id = auth.uid()
      and pp.permission_key = p_key
  ) or exists (
    select 1
    from public.profile_staff_roles psr
    join public.staff_role_permissions srp on srp.role_id = psr.role_id
    where psr.profile_id = auth.uid()
      and srp.permission_key = p_key
  );
$$;

/** True when the caller holds `p_key` inside their own school. */
create function private.has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case private.jwt_role()
    when 'school_admin' then true
    when 'staff' then private.has_granted_permission(p_key)
    when 'teacher' then private.has_granted_permission(p_key)
    else false
  end;
$$;

grant execute on function
  private.jwt_school_id(),
  private.jwt_role(),
  private.is_super_admin(),
  private.has_permission(text),
  private.has_granted_permission(text)
to authenticated;

-- ---------------------------------------------------------------------
-- Auth integration
-- ---------------------------------------------------------------------

/**
 * Creates the profile for a user created through the Admin API.
 * role / school_id come from app_metadata, which only the service role can write,
 * so a self-signup can never mint a privileged profile.
 */
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'role';
begin
  if v_role is null then
    return new; -- not provisioned by the platform: no profile, therefore no access.
  end if;

  insert into public.profiles (id, school_id, role, full_name, email, phone)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'school_id', '')::uuid,
    v_role::public.app_role,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    new.phone
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

/**
 * Custom Access Token Hook: adds `school_id` + `user_role` claims and refuses tokens
 * for deactivated accounts or suspended schools.
 * Enable in Dashboard → Authentication → Hooks → Customize Access Token.
 */
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_claims jsonb := event -> 'claims';
  v_profile record;
begin
  select p.role, p.school_id, p.is_active, s.status as school_status
  into v_profile
  from public.profiles p
  left join public.schools s on s.id = p.school_id
  where p.id = (event ->> 'user_id')::uuid;

  if not found then
    return event;
  end if;

  if not v_profile.is_active or v_profile.school_status = 'suspended' then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 403, 'message', 'account_disabled')
    );
  end if;

  v_claims := jsonb_set(v_claims, '{user_role}', to_jsonb(v_profile.role::text));
  v_claims := jsonb_set(
    v_claims,
    '{school_id}',
    coalesce(to_jsonb(v_profile.school_id::text), 'null'::jsonb)
  );

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on public.profiles, public.schools to supabase_auth_admin;

/**
 * One-off bootstrap: promote an existing auth user (created in the dashboard) to platform owner.
 * Run from the SQL editor: select private.bootstrap_super_admin('owner@example.com', 'Owner Name');
 */
create function private.bootstrap_super_admin(p_email text, p_full_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = lower(p_email);
  if v_user_id is null then
    raise exception 'No auth user with email %', p_email;
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"super_admin"}'::jsonb
  where id = v_user_id;

  insert into public.profiles (id, school_id, role, full_name, email)
  values (v_user_id, null, 'super_admin', p_full_name, lower(p_email))
  on conflict (id) do update set role = 'super_admin', school_id = null, full_name = excluded.full_name;
end;
$$;

revoke execute on function private.bootstrap_super_admin(text, text) from public, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.schools enable row level security;
alter table public.features enable row level security;
alter table public.school_features enable row level security;
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.staff_roles enable row level security;
alter table public.staff_role_permissions enable row level security;
alter table public.profile_staff_roles enable row level security;
alter table public.profile_permissions enable row level security;

-- schools ------------------------------------------------------------
create policy "schools: members and platform owner read"
on public.schools for select to authenticated
using (
  (select private.is_super_admin())
  or id = (select private.jwt_school_id())
);

create policy "schools: platform owner inserts"
on public.schools for insert to authenticated
with check ((select private.is_super_admin()));

create policy "schools: platform owner updates"
on public.schools for update to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

create policy "schools: platform owner deletes"
on public.schools for delete to authenticated
using ((select private.is_super_admin()));

create policy "schools: auth hook reads"
on public.schools for select to supabase_auth_admin
using (true);

-- features catalog ---------------------------------------------------
create policy "features: readable by signed-in users"
on public.features for select to authenticated
using (true);

-- school_features ----------------------------------------------------
create policy "school_features: members and platform owner read"
on public.school_features for select to authenticated
using (
  (select private.is_super_admin())
  or school_id = (select private.jwt_school_id())
);

create policy "school_features: platform owner manages"
on public.school_features for all to authenticated
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

-- profiles -----------------------------------------------------------
create policy "profiles: read own"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "profiles: platform owner reads all"
on public.profiles for select to authenticated
using ((select private.is_super_admin()));

create policy "profiles: school managers read by permission"
on public.profiles for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (
    -- Each (select …) is evaluated once per statement, not per row.
    (role = 'student' and (select private.has_permission('students.view')))
    or (role = 'teacher' and (select private.has_permission('teachers.view')))
    or (role = 'parent' and (select private.has_permission('parents.view')))
    or (role in ('staff', 'school_admin') and (select private.has_permission('staff.view')))
  )
);

create policy "profiles: update own contact fields"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "profiles: auth hook reads"
on public.profiles for select to supabase_auth_admin
using (true);

-- Users may only edit their own display fields; role, school, and activation are
-- managed through server actions with the service role.
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_path) on public.profiles to authenticated;

-- permissions catalog ------------------------------------------------
create policy "permissions: readable by signed-in users"
on public.permissions for select to authenticated
using (true);

-- staff roles & grants -----------------------------------------------
create policy "staff_roles: school members read"
on public.staff_roles for select to authenticated
using (school_id = (select private.jwt_school_id()));

create policy "staff_roles: managed with roles.manage"
on public.staff_roles for all to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('roles.manage'))
)
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('roles.manage'))
);

create policy "staff_role_permissions: school members read"
on public.staff_role_permissions for select to authenticated
using (school_id = (select private.jwt_school_id()));

create policy "staff_role_permissions: managed with roles.manage"
on public.staff_role_permissions for all to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('roles.manage'))
)
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('roles.manage'))
);

create policy "profile_staff_roles: own or roles.manage read"
on public.profile_staff_roles for select to authenticated
using (
  profile_id = (select auth.uid())
  or (
    school_id = (select private.jwt_school_id())
    and (select private.has_permission('roles.manage'))
  )
);

create policy "profile_staff_roles: managed with roles.manage"
on public.profile_staff_roles for all to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('roles.manage'))
)
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('roles.manage'))
);

create policy "profile_permissions: own or roles.manage read"
on public.profile_permissions for select to authenticated
using (
  profile_id = (select auth.uid())
  or (
    school_id = (select private.jwt_school_id())
    and (select private.has_permission('roles.manage'))
  )
);

create policy "profile_permissions: managed with roles.manage"
on public.profile_permissions for all to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('roles.manage'))
)
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('roles.manage'))
);

-- ---------------------------------------------------------------------
-- RPCs used by the service layer
-- ---------------------------------------------------------------------

/** Effective permission keys of the caller (all keys for a school admin). */
create function public.my_permissions()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(p.key order by p.key), '{}')
  from public.permissions p
  where private.has_permission(p.key);
$$;

revoke execute on function public.my_permissions() from public, anon;
grant execute on function public.my_permissions() to authenticated;

/** Branding is the only part of the school record a school can edit itself. */
create function public.update_school_branding(
  p_primary_color text,
  p_secondary_color text,
  p_logo_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid := private.jwt_school_id();
begin
  if v_school_id is null or not private.has_permission('settings.branding') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.schools
  set primary_color = p_primary_color,
      secondary_color = p_secondary_color,
      logo_path = coalesce(p_logo_path, logo_path)
  where id = v_school_id;
end;
$$;

revoke execute on function public.update_school_branding(text, text, text) from public, anon;
grant execute on function public.update_school_branding(text, text, text) to authenticated;

/** One round trip for the Super Admin dashboard KPIs. */
create function public.platform_stats()
returns table (
  schools_total bigint,
  schools_active bigint,
  students_total bigint,
  teachers_total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.schools),
    (select count(*) from public.schools where status = 'active'),
    (select count(*) from public.profiles where role = 'student'),
    (select count(*) from public.profiles where role = 'teacher');
end;
$$;

revoke execute on function public.platform_stats() from public, anon;
grant execute on function public.platform_stats() to authenticated;

/** Schools list with per-school headcounts; RLS on schools still applies (security_invoker). */
create view public.schools_overview
with (security_invoker = true)
as
select
  s.id,
  s.name,
  s.slug,
  s.status,
  s.created_at,
  (select count(*) from public.profiles p where p.school_id = s.id and p.role = 'student') as students_count,
  (select count(*) from public.profiles p where p.school_id = s.id and p.role = 'teacher') as teachers_count
from public.schools s;

grant select on public.schools_overview to authenticated;

/** Replace a school's enabled modules atomically. Runs as the caller, so RLS limits it to the platform owner. */
create function public.set_school_features(p_school_id uuid, p_features text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.school_features
  where school_id = p_school_id
    and feature_key <> all (p_features);

  insert into public.school_features (school_id, feature_key)
  select p_school_id, f
  from unnest(p_features) as f
  on conflict do nothing;
end;
$$;

revoke execute on function public.set_school_features(uuid, text[]) from public, anon;
grant execute on function public.set_school_features(uuid, text[]) to authenticated;
