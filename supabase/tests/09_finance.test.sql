begin;
select plan(10);

-- Fixtures: grades G1 (Student A) and G2 (Student B), a teacher, the school admin and a platform owner.
insert into public.schools (id, name, slug) values ('00000000-0000-0000-0000-0000000000e9', 'School F', 'school-fin');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('10000000-0000-0000-0000-0000000000e9', 'admin-fin@test.local', '{"role":"school_admin","school_id":"00000000-0000-0000-0000-0000000000e9"}', '{"full_name":"Admin"}'),
  ('20000000-0000-0000-0000-0000000000e9', 'teacher-fin@test.local', '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000e9"}', '{"full_name":"Teacher"}'),
  ('30000000-0000-0000-0000-0000000000e9', 'student-fin@test.local', '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000e9"}', '{"full_name":"Student A"}'),
  ('30000000-0000-0000-0000-0000000000e8', 'student-fin2@test.local', '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000e9"}', '{"full_name":"Student B"}'),
  ('50000000-0000-0000-0000-0000000000e9', 'owner-fin@test.local', '{"role":"super_admin"}', '{"full_name":"Owner"}');
insert into public.academic_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('a0000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e9', '2026/2027', '2026-09-01', '2027-06-30', true);
insert into public.grade_levels (id, school_id, name, sort_order) values
  ('b0000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e9', 'G1', 1),
  ('b0000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e9', 'G2', 2);
insert into public.classes (id, school_id, academic_year_id, grade_level_id, name) values
  ('c0000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e9', 'a0000000-0000-0000-0000-0000000000e9', 'b0000000-0000-0000-0000-0000000000e9', '1/A'),
  ('c0000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e9', 'a0000000-0000-0000-0000-0000000000e9', 'b0000000-0000-0000-0000-0000000000e8', '2/A');
insert into public.student_enrollments (school_id, student_id, class_id, academic_year_id) values
  ('00000000-0000-0000-0000-0000000000e9', '30000000-0000-0000-0000-0000000000e9', 'c0000000-0000-0000-0000-0000000000e9', 'a0000000-0000-0000-0000-0000000000e9'),
  ('00000000-0000-0000-0000-0000000000e9', '30000000-0000-0000-0000-0000000000e8', 'c0000000-0000-0000-0000-0000000000e8', 'a0000000-0000-0000-0000-0000000000e9');

create function pg_temp.act_as(p_user uuid, p_role text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', p_user, 'role', 'authenticated', 'user_role', p_role,
           'school_id', case when p_role = 'super_admin' then null else '00000000-0000-0000-0000-0000000000e9' end)::text, true);
$$;

select pg_temp.act_as('10000000-0000-0000-0000-0000000000e9', 'school_admin');
insert into public.fee_items (school_id, academic_year_id, name, amount) values
  ('00000000-0000-0000-0000-0000000000e9', 'a0000000-0000-0000-0000-0000000000e9', 'Tuition', 1000);
insert into public.fee_items (school_id, academic_year_id, grade_level_id, name, amount) values
  ('00000000-0000-0000-0000-0000000000e9', 'a0000000-0000-0000-0000-0000000000e9', 'b0000000-0000-0000-0000-0000000000e8', 'Lab G2', 200);
insert into public.fee_payments (school_id, student_id, academic_year_id, amount, method) values
  ('00000000-0000-0000-0000-0000000000e9', '30000000-0000-0000-0000-0000000000e9', 'a0000000-0000-0000-0000-0000000000e9', 400, 'cash');
select is(
  (select string_agg(full_name || ':' || due::int || '/' || paid::int, ',' order by full_name)
   from public.student_balances('a0000000-0000-0000-0000-0000000000e9')),
  'Student A:1000/400,Student B:1200/0', 'Balances follow each grade''s fees and the payments'
);

select pg_temp.act_as('20000000-0000-0000-0000-0000000000e9', 'teacher');
select is((select count(*)::int from public.fee_payments), 0, 'Teachers do not see payments');
select throws_ok(
  $$ insert into public.fee_items (school_id, academic_year_id, name, amount)
     values ('00000000-0000-0000-0000-0000000000e9', 'a0000000-0000-0000-0000-0000000000e9', 'X', 5) $$,
  '42501', null, 'Teachers cannot add fees'
);

select pg_temp.act_as('30000000-0000-0000-0000-0000000000e9', 'student');
select is((select count(*)::int from public.fee_payments), 1, 'A student sees their own payments');
select is((select string_agg(name, ',') from public.fee_items), 'Tuition', 'A student sees only their grade''s fees');
select pg_temp.act_as('30000000-0000-0000-0000-0000000000e8', 'student');
select is((select count(*)::int from public.fee_payments), 0, 'Other students see no one else''s payments');

select pg_temp.act_as('10000000-0000-0000-0000-0000000000e9', 'school_admin');
select throws_ok(
  $$ insert into public.plans (name, monthly_price, yearly_price) values ('Hack', 0, 0) $$,
  '42501', null, 'School admins cannot touch platform plans'
);

select pg_temp.act_as('50000000-0000-0000-0000-0000000000e9', 'super_admin');
insert into public.plans (id, name, monthly_price, yearly_price, features) values
  ('96000000-0000-0000-0000-0000000000e9', 'Pro test', 100, 1000, array['homework', 'exams']);
select public.subscribe_school('00000000-0000-0000-0000-0000000000e9', '96000000-0000-0000-0000-0000000000e9', 'yearly', '2026-10-01');
select is(
  (select ends_on::text from public.school_subscriptions where school_id = '00000000-0000-0000-0000-0000000000e9'),
  '2027-10-01', 'A yearly subscription lasts a year'
);
select is(
  (select amount::int from public.platform_transactions
   where school_id = '00000000-0000-0000-0000-0000000000e9' and kind = 'income'),
  1000, 'The price is booked as income'
);
select is(
  (select array_agg(feature_key order by feature_key)::text from public.school_features
   where school_id = '00000000-0000-0000-0000-0000000000e9'),
  '{exams,homework}', 'The plan''s features are applied to the school'
);

select * from finish();
rollback;
