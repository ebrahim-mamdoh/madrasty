begin;
select plan(7);

-- Fixtures: two schools, one admin and one teacher each.
insert into public.schools (id, name, slug) values
  ('00000000-0000-0000-0000-00000000000a', 'School A', 'school-a'),
  ('00000000-0000-0000-0000-00000000000b', 'School B', 'school-b');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('10000000-0000-0000-0000-00000000000a', 'admin-a@test.local',
   '{"role":"school_admin","school_id":"00000000-0000-0000-0000-00000000000a"}', '{"full_name":"Admin A"}'),
  ('20000000-0000-0000-0000-00000000000a', 'teacher-a@test.local',
   '{"role":"teacher","school_id":"00000000-0000-0000-0000-00000000000a"}', '{"full_name":"Teacher A"}'),
  ('10000000-0000-0000-0000-00000000000b', 'admin-b@test.local',
   '{"role":"school_admin","school_id":"00000000-0000-0000-0000-00000000000b"}', '{"full_name":"Admin B"}'),
  ('30000000-0000-0000-0000-00000000000a', 'selfsignup@test.local', '{}', '{}');

select is(
  (select count(*)::int from public.profiles where id = '30000000-0000-0000-0000-00000000000a'),
  0,
  'A user without platform-assigned role gets no profile'
);

-- GoTrue's admin createUser writes app_metadata in a follow-up UPDATE, not in the INSERT.
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('40000000-0000-0000-0000-00000000000a', 'late-role@test.local', '{"provider":"email"}', '{"full_name":"Late Role"}');
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"teacher","school_id":"00000000-0000-0000-0000-00000000000a"}'
where id = '40000000-0000-0000-0000-00000000000a';

select is(
  (select role::text from public.profiles where id = '40000000-0000-0000-0000-00000000000a'),
  'teacher',
  'A role added to app_metadata after insert still provisions the profile'
);

-- Act as Admin A.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub', '10000000-0000-0000-0000-00000000000a',
  'role', 'authenticated',
  'user_role', 'school_admin',
  'school_id', '00000000-0000-0000-0000-00000000000a'
)::text, true);

select is((select count(*)::int from public.schools), 1, 'School admin sees only their school');
select is(
  (select count(*)::int from public.profiles where school_id = '00000000-0000-0000-0000-00000000000b'),
  0,
  'School admin cannot read another school''s profiles'
);
select throws_ok(
  $$ insert into public.subjects (school_id, name) values ('00000000-0000-0000-0000-00000000000b', 'Math') $$,
  '42501',
  null,
  'School admin cannot write into another school'
);

-- Act as Teacher A (no grants).
select set_config('request.jwt.claims', json_build_object(
  'sub', '20000000-0000-0000-0000-00000000000a',
  'role', 'authenticated',
  'user_role', 'teacher',
  'school_id', '00000000-0000-0000-0000-00000000000a'
)::text, true);

select throws_ok(
  $$ insert into public.subjects (school_id, name) values ('00000000-0000-0000-0000-00000000000a', 'Science') $$,
  '42501',
  null,
  'Teacher without structure.manage cannot change the structure'
);
select throws_ok(
  $$ update public.profiles set role = 'school_admin' where id = '20000000-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'Users cannot escalate their own role'
);

select * from finish();
rollback;
