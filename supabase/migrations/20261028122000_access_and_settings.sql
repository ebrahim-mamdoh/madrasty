-- =====================================================================
-- P1 — access control & school settings
--   * private.has_feature(): plan features enforced at the DB level
--     (used by every feature-owned table from P3 on).
--   * Roles/permissions may only be granted to staff and teachers.
--   * School settings RPC: name, colors, logo, timezone (replaces the
--     branding-only RPC).
-- =====================================================================

/** True when the caller's school has `p_key` enabled in its plan. */
create function private.has_feature(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.school_features sf
    where sf.school_id = private.jwt_school_id()
      and sf.feature_key = p_key
  );
$$;

grant execute on function private.has_feature(text) to authenticated;

-- ---------------------------------------------------------------------
-- Grants only to accounts that work in the admin/teacher portals.
-- (Without this, roles.manage could hand permissions to a student.)
-- ---------------------------------------------------------------------
create function private.check_grantee_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.profile_id and role in ('staff', 'teacher')
  ) then
    raise exception 'Permissions can only be granted to staff or teachers' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger profile_staff_roles_check_grantee
before insert or update of profile_id on public.profile_staff_roles
for each row execute function private.check_grantee_role();

create trigger profile_permissions_check_grantee
before insert or update of profile_id on public.profile_permissions
for each row execute function private.check_grantee_role();

-- ---------------------------------------------------------------------
-- School settings (what a school may change about itself)
-- ---------------------------------------------------------------------
drop function public.update_school_branding(text, text, text);

create function public.update_school_settings(
  p_name text,
  p_primary_color text,
  p_secondary_color text,
  p_timezone text,
  p_logo_path text default null,
  p_remove_logo boolean default false
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
  if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'invalid timezone' using errcode = '22023';
  end if;
  -- A school may only point at files inside its own branding folder.
  if p_logo_path is not null and split_part(p_logo_path, '/', 1) <> v_school_id::text then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.schools
  set name = p_name,
      primary_color = p_primary_color,
      secondary_color = p_secondary_color,
      timezone = p_timezone,
      logo_path = case
        when p_remove_logo then null
        else coalesce(p_logo_path, logo_path)
      end
  where id = v_school_id;
end;
$$;

revoke execute on function public.update_school_settings(text, text, text, text, text, boolean) from public, anon;
grant execute on function public.update_school_settings(text, text, text, text, text, boolean) to authenticated;
