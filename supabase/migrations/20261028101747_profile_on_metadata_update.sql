-- =====================================================================
-- Fix: GoTrue's admin createUser inserts the auth user first and writes the
-- custom app_metadata (role, school_id) in a follow-up UPDATE, so the INSERT
-- trigger saw no role and skipped the profile. Also create the profile when
-- app_metadata gains a role. Existing profiles are never changed this way.
-- =====================================================================

create or replace function private.handle_new_user()
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
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_provisioned
after update of raw_app_meta_data on auth.users
for each row
when (new.raw_app_meta_data ? 'role' and not (old.raw_app_meta_data ? 'role'))
execute function private.handle_new_user();

-- Backfill accounts provisioned before this fix.
insert into public.profiles (id, school_id, role, full_name, email, phone)
select
  u.id,
  nullif(u.raw_app_meta_data ->> 'school_id', '')::uuid,
  (u.raw_app_meta_data ->> 'role')::public.app_role,
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)),
  u.email,
  u.phone
from auth.users u
where u.raw_app_meta_data ? 'role'
  and not exists (select 1 from public.profiles p where p.id = u.id);
