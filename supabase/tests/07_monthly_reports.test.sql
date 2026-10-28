begin;
select plan(9);

-- Fixtures: class 1/A (homeroom Teacher R) with Student R and their parent; Teacher R2 elsewhere.
insert into public.schools (id, name, slug) values ('00000000-0000-0000-0000-0000000000c9', 'School R', 'school-r');
insert into public.school_features (school_id, feature_key) values ('00000000-0000-0000-0000-0000000000c9', 'monthly_reports');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('20000000-0000-0000-0000-0000000000c9', 'teacher-r@test.local', '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000c9"}', '{"full_name":"Teacher R"}'),
  ('20000000-0000-0000-0000-0000000000c8', 'teacher-r2@test.local', '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000c9"}', '{"full_name":"Teacher R2"}'),
  ('30000000-0000-0000-0000-0000000000c9', 'student-r@test.local', '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000c9"}', '{"full_name":"Student R"}'),
  ('40000000-0000-0000-0000-0000000000c9', 'parent-r@test.local', '{"role":"parent","school_id":"00000000-0000-0000-0000-0000000000c9"}', '{"full_name":"Parent R"}');
insert into public.academic_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('a0000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000c9', '2026/2027', '2026-09-01', '2027-06-30', true);
insert into public.grade_levels (id, school_id, name, sort_order) values
  ('b0000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000c9', 'G1', 1);
insert into public.classes (id, school_id, academic_year_id, grade_level_id, name, homeroom_teacher_id) values
  ('c0000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000c9', 'a0000000-0000-0000-0000-0000000000c9',
   'b0000000-0000-0000-0000-0000000000c9', '1/A', '20000000-0000-0000-0000-0000000000c9');
insert into public.student_enrollments (school_id, student_id, class_id, academic_year_id) values
  ('00000000-0000-0000-0000-0000000000c9', '30000000-0000-0000-0000-0000000000c9', 'c0000000-0000-0000-0000-0000000000c9', 'a0000000-0000-0000-0000-0000000000c9');
insert into public.parent_students (school_id, parent_id, student_id) values
  ('00000000-0000-0000-0000-0000000000c9', '40000000-0000-0000-0000-0000000000c9', '30000000-0000-0000-0000-0000000000c9');

create function pg_temp.act_as(p_user uuid, p_role text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', p_user, 'role', 'authenticated', 'user_role', p_role,
           'school_id', '00000000-0000-0000-0000-0000000000c9')::text, true);
$$;

select pg_temp.act_as('20000000-0000-0000-0000-0000000000c8', 'teacher');
select throws_ok(
  $$ insert into public.monthly_reports (school_id, student_id, class_id, month)
     values ('00000000-0000-0000-0000-0000000000c9', '30000000-0000-0000-0000-0000000000c9',
             'c0000000-0000-0000-0000-0000000000c9', '2026-10-01') $$,
  '42501', null, 'A teacher of another class cannot write the report'
);

select pg_temp.act_as('20000000-0000-0000-0000-0000000000c9', 'teacher');
select throws_ok(
  $$ insert into public.monthly_reports (school_id, student_id, class_id, month, ratings)
     values ('00000000-0000-0000-0000-0000000000c9', '30000000-0000-0000-0000-0000000000c9',
             'c0000000-0000-0000-0000-0000000000c9', '2026-10-01', '{"behavior": 9}') $$,
  'MD013', null, 'Ratings are 1 to 5'
);
select throws_ok(
  $$ insert into public.monthly_reports (school_id, student_id, class_id, month)
     values ('00000000-0000-0000-0000-0000000000c9', '30000000-0000-0000-0000-0000000000c9',
             'c0000000-0000-0000-0000-0000000000c9', '2026-10-15') $$,
  '23514', null, 'A report month is stored as its first day'
);
insert into public.monthly_reports (id, school_id, student_id, class_id, month, ratings, academic_note) values
  ('95000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000c9', '30000000-0000-0000-0000-0000000000c9',
   'c0000000-0000-0000-0000-0000000000c9', '2026-10-01', '{"behavior": 5, "participation": 4}', 'good');

select pg_temp.act_as('40000000-0000-0000-0000-0000000000c9', 'parent');
select is((select count(*)::int from public.monthly_reports), 0, 'Parents do not see drafts');

select pg_temp.act_as('20000000-0000-0000-0000-0000000000c9', 'teacher');
select throws_ok(
  $$ update public.monthly_reports set status = 'sent' $$,
  '42501', null, 'The status cannot be set directly'
);
select is(public.send_monthly_reports(array['95000000-0000-0000-0000-0000000000c9'::uuid]), 1,
  'The class teacher sends the report');
update public.monthly_reports set academic_note = 'changed';
select is((select academic_note from public.monthly_reports), 'good', 'A sent report is locked');

select pg_temp.act_as('40000000-0000-0000-0000-0000000000c9', 'parent');
select is((select count(*)::int from public.monthly_reports), 1, 'Parents read the sent report');
select is((select count(*)::int from public.notifications where kind = 'monthly_report'), 1,
  'Parents are notified');

select * from finish();
rollback;
