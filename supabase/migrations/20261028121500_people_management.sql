-- =====================================================================
-- People management: school managers may edit the display fields
-- (full_name, phone — the only columns `authenticated` can update) of
-- people in their school, gated by the role's manage permission.
-- Role, school, email and activation stay service-role only.
-- One combined UPDATE policy (instead of two permissive ones) keeps the
-- advisor's multiple-permissive-policies check clean.
-- =====================================================================

drop policy "profiles: update own contact fields" on public.profiles;

create policy "profiles: update own or managed contact fields"
on public.profiles for update to authenticated
using (
  id = (select auth.uid())
  or (
    school_id = (select private.jwt_school_id())
    and (
      (role = 'student' and (select private.has_permission('students.manage')))
      or (role = 'teacher' and (select private.has_permission('teachers.manage')))
      or (role = 'parent' and (select private.has_permission('parents.manage')))
      or (role = 'staff' and (select private.has_permission('staff.manage')))
    )
  )
)
with check (
  id = (select auth.uid())
  or (
    school_id = (select private.jwt_school_id())
    and (
      (role = 'student' and (select private.has_permission('students.manage')))
      or (role = 'teacher' and (select private.has_permission('teachers.manage')))
      or (role = 'parent' and (select private.has_permission('parents.manage')))
      or (role = 'staff' and (select private.has_permission('staff.manage')))
    )
  )
);

-- Name search within a school (people lists filter by school + role, then name).
create extension if not exists pg_trgm with schema extensions;

create index profiles_full_name_trgm_idx
  on public.profiles using gin (full_name extensions.gin_trgm_ops);
