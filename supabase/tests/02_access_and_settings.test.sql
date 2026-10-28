begin;
select plan(9);

-- Fixtures: one school with an admin, a staff member, a teacher and a student; another school.
insert into public.schools (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000c1', 'School C', 'school-c'),
  ('00000000-0000-0000-0000-0000000000c2', 'School D', 'school-d');

insert into public.school_features (school_id, feature_key) values
  ('00000000-0000-0000-0000-0000000000c1', 'homework');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('10000000-0000-0000-0000-0000000000c1', 'admin-c@test.local',
   '{"role":"school_admin","school_id":"00000000-0000-0000-0000-0000000000c1"}', '{"full_name":"Admin C"}'),
  ('50000000-0000-0000-0000-0000000000c1', 'staff-c@test.local',
   '{"role":"staff","school_id":"00000000-0000-0000-0000-0000000000c1"}', '{"full_name":"Staff C"}'),
  ('60000000-0000-0000-0000-0000000000c1', 'student-c@test.local',
   '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000c1"}', '{"full_name":"Student C"}');

insert into public.staff_roles (id, school_id, name) values
  ('70000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'Supervisor');

-- Grants only make sense for staff and teachers.
select throws_ok(
  $$ insert into public.profile_permissions (school_id, profile_id, permission_key)
     values ('00000000-0000-0000-0000-0000000000c1', '60000000-0000-0000-0000-0000000000c1', 'students.view') $$,
  '23514',
  null,
  'A student cannot be granted an individual permission'
);
select throws_ok(
  $$ insert into public.profile_staff_roles (school_id, profile_id, role_id)
     values ('00000000-0000-0000-0000-0000000000c1', '60000000-0000-0000-0000-0000000000c1',
             '70000000-0000-0000-0000-0000000000c1') $$,
  '23514',
  null,
  'A student cannot be given a staff role'
);
select lives_ok(
  $$ insert into public.profile_staff_roles (school_id, profile_id, role_id)
     values ('00000000-0000-0000-0000-0000000000c1', '50000000-0000-0000-0000-0000000000c1',
             '70000000-0000-0000-0000-0000000000c1') $$,
  'A staff member can be given a staff role'
);

-- Act as Admin C.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub', '10000000-0000-0000-0000-0000000000c1',
  'role', 'authenticated',
  'user_role', 'school_admin',
  'school_id', '00000000-0000-0000-0000-0000000000c1'
)::text, true);

select ok(private.has_feature('homework'), 'has_feature sees an enabled module');
select ok(not private.has_feature('exams'), 'has_feature rejects a module outside the plan');

select lives_ok(
  $$ select public.update_school_settings('مدرسة سي', '#112233', '#445566', 'Asia/Riyadh') $$,
  'School admin updates their own settings'
);
select is(
  (select timezone from public.schools where id = '00000000-0000-0000-0000-0000000000c1'),
  'Asia/Riyadh',
  'Settings are saved on the caller''s school'
);
select throws_ok(
  $$ select public.update_school_settings('X School', '#112233', '#445566', 'Mars/Olympus') $$,
  '22023',
  null,
  'An unknown time zone is refused'
);
select throws_ok(
  $$ select public.update_school_settings('X School', '#112233', '#445566', 'UTC',
       '00000000-0000-0000-0000-0000000000c2/logo.png') $$,
  '42501',
  null,
  'A logo path outside the school''s own folder is refused'
);

select * from finish();
rollback;
