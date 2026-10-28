-- =====================================================================
-- Hardening after the Supabase security & performance advisors.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Security: least privilege on SECURITY DEFINER functions
-- ---------------------------------------------------------------------

-- Supabase's auto-enable-RLS event trigger function: fires on DDL regardless of EXECUTE grants,
-- so API roles never need to call it.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- These only read rows the caller can already see through RLS, so they run as the caller.
alter function public.my_permissions() security invoker;
alter function public.platform_stats() security invoker;
-- update_school_branding stays SECURITY DEFINER on purpose: schools are writable only by the
-- platform owner, and this function is the narrow, permission-checked path for branding columns.

-- ---------------------------------------------------------------------
-- Performance: one SELECT policy per table (multiple permissive policies are OR-ed and
-- each is evaluated), and write policies split out of FOR ALL.
-- ---------------------------------------------------------------------

-- Structure tables: read = school members, write = structure.manage
do $$
declare
  t text;
  op text;
begin
  foreach t in array array['academic_years', 'grade_levels', 'subjects', 'classes', 'class_subjects']
  loop
    execute format('drop policy "%1$s: managed with structure.manage" on public.%1$I', t);
    foreach op in array array['insert', 'update', 'delete']
    loop
      execute format(
        'create policy "%1$s: %2$s with structure.manage" on public.%1$I for %2$s to authenticated %3$s',
        t,
        op,
        case op
          when 'insert' then
            'with check (school_id = (select private.jwt_school_id()) and (select private.has_permission(''structure.manage'')))'
          when 'update' then
            'using (school_id = (select private.jwt_school_id()) and (select private.has_permission(''structure.manage'')))
             with check (school_id = (select private.jwt_school_id()) and (select private.has_permission(''structure.manage'')))'
          else
            'using (school_id = (select private.jwt_school_id()) and (select private.has_permission(''structure.manage'')))'
        end
      );
    end loop;
  end loop;
end;
$$;

-- Generic helper: replace a FOR ALL "manage" policy with insert/update/delete policies.
create function private.split_manage_policy(p_table text, p_old_policy text, p_condition text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('drop policy %I on public.%I', p_old_policy, p_table);
  execute format('create policy %I on public.%I for insert to authenticated with check (%s)',
    p_table || ': insert', p_table, p_condition);
  execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
    p_table || ': update', p_table, p_condition, p_condition);
  execute format('create policy %I on public.%I for delete to authenticated using (%s)',
    p_table || ': delete', p_table, p_condition);
end;
$$;

select private.split_manage_policy(
  'school_features', 'school_features: platform owner manages',
  '(select private.is_super_admin())'
);

select private.split_manage_policy(
  'staff_roles', 'staff_roles: managed with roles.manage',
  'school_id = (select private.jwt_school_id()) and (select private.has_permission(''roles.manage''))'
);

select private.split_manage_policy(
  'staff_role_permissions', 'staff_role_permissions: managed with roles.manage',
  'school_id = (select private.jwt_school_id()) and (select private.has_permission(''roles.manage''))'
);

select private.split_manage_policy(
  'profile_staff_roles', 'profile_staff_roles: managed with roles.manage',
  'school_id = (select private.jwt_school_id()) and (select private.has_permission(''roles.manage''))'
);

select private.split_manage_policy(
  'profile_permissions', 'profile_permissions: managed with roles.manage',
  'school_id = (select private.jwt_school_id()) and (select private.has_permission(''roles.manage''))'
);

select private.split_manage_policy(
  'student_enrollments', 'student_enrollments: managed with students.manage',
  'school_id = (select private.jwt_school_id()) and (select private.has_permission(''students.manage''))'
);

select private.split_manage_policy(
  'parent_students', 'parent_students: managed with parents.manage',
  'school_id = (select private.jwt_school_id()) and (select private.has_permission(''parents.manage''))'
);

drop function private.split_manage_policy(text, text, text);

-- profiles: merge the five read paths into one policy.
drop policy "profiles: read own" on public.profiles;
drop policy "profiles: platform owner reads all" on public.profiles;
drop policy "profiles: school managers read by permission" on public.profiles;
drop policy "profiles: teachers read their students" on public.profiles;
drop policy "profiles: parents read their children" on public.profiles;

create policy "profiles: read" on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.is_super_admin())
  or (
    school_id = (select private.jwt_school_id())
    and (
      (role = 'student' and (select private.has_permission('students.view')))
      or (role = 'teacher' and (select private.has_permission('teachers.view')))
      or (role = 'parent' and (select private.has_permission('parents.view')))
      or (role in ('staff', 'school_admin') and (select private.has_permission('staff.view')))
    )
  )
  or id in (select private.teacher_student_ids())
  or id in (select private.parent_student_ids())
);

-- student_enrollments: merge read paths.
drop policy "student_enrollments: staff with students.view read" on public.student_enrollments;
drop policy "student_enrollments: teachers read their classes" on public.student_enrollments;
drop policy "student_enrollments: students read own" on public.student_enrollments;
drop policy "student_enrollments: parents read children" on public.student_enrollments;

create policy "student_enrollments: read" on public.student_enrollments for select to authenticated
using (
  student_id = (select auth.uid())
  or (
    school_id = (select private.jwt_school_id())
    and (select private.has_permission('students.view'))
  )
  or class_id in (select private.teacher_class_ids())
  or student_id in (select private.parent_student_ids())
);

-- parent_students: merge read paths.
drop policy "parent_students: staff with parents.view read" on public.parent_students;
drop policy "parent_students: parents read own links" on public.parent_students;

create policy "parent_students: read" on public.parent_students for select to authenticated
using (
  parent_id = (select auth.uid())
  or (
    school_id = (select private.jwt_school_id())
    and (select private.has_permission('parents.view'))
  )
);

-- ---------------------------------------------------------------------
-- Performance: indexes that cover every composite tenant FK (x_id, school_id),
-- so cascades and joins never scan. Superseded single-column indexes are dropped.
-- ---------------------------------------------------------------------
drop index public.classes_grade_level_idx;
drop index public.classes_homeroom_teacher_idx;
drop index public.classes_school_year_idx;
drop index public.class_subjects_subject_idx;
drop index public.class_subjects_teacher_idx;
drop index public.student_enrollments_class_idx;
drop index public.parent_students_student_idx;
drop index public.profile_staff_roles_role_idx;

create index classes_year_school_idx on public.classes (academic_year_id, school_id);
create index classes_grade_school_idx on public.classes (grade_level_id, school_id);
create index classes_homeroom_school_idx on public.classes (homeroom_teacher_id, school_id);

create index class_subjects_class_school_idx on public.class_subjects (class_id, school_id);
create index class_subjects_subject_school_idx on public.class_subjects (subject_id, school_id);
create index class_subjects_teacher_school_idx on public.class_subjects (teacher_id, school_id);

create index student_enrollments_class_school_idx on public.student_enrollments (class_id, school_id);
create index student_enrollments_class_year_idx on public.student_enrollments (class_id, academic_year_id);
create index student_enrollments_student_school_idx on public.student_enrollments (student_id, school_id);

create index parent_students_parent_school_idx on public.parent_students (parent_id, school_id);
create index parent_students_student_school_idx on public.parent_students (student_id, school_id);

create index profile_staff_roles_profile_school_idx on public.profile_staff_roles (profile_id, school_id);
create index profile_staff_roles_role_school_idx on public.profile_staff_roles (role_id, school_id);

create index profile_permissions_profile_school_idx on public.profile_permissions (profile_id, school_id);
create index profile_permissions_key_idx on public.profile_permissions (permission_key);

create index staff_role_permissions_role_school_idx on public.staff_role_permissions (role_id, school_id);
create index staff_role_permissions_key_idx on public.staff_role_permissions (permission_key);

create index school_features_feature_idx on public.school_features (feature_key);
