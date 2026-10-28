begin;
select plan(4);

-- Fixtures: Teacher N teaches Math in 1/A; Admin N reviews exams.
insert into public.schools (id, name, slug) values ('00000000-0000-0000-0000-0000000000d7', 'School N', 'school-n');
insert into public.school_features (school_id, feature_key) values ('00000000-0000-0000-0000-0000000000d7', 'exams');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('10000000-0000-0000-0000-0000000000d7', 'admin-n@test.local', '{"role":"school_admin","school_id":"00000000-0000-0000-0000-0000000000d7"}', '{"full_name":"Admin N"}'),
  ('20000000-0000-0000-0000-0000000000d7', 'teacher-n@test.local', '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000d7"}', '{"full_name":"Teacher N"}');
insert into public.academic_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('a0000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d7', '2026/2027', '2026-09-01', '2027-06-30', true);
insert into public.grade_levels (id, school_id, name, sort_order) values
  ('b0000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d7', 'G1', 1);
insert into public.classes (id, school_id, academic_year_id, grade_level_id, name) values
  ('c0000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d7', 'a0000000-0000-0000-0000-0000000000d7', 'b0000000-0000-0000-0000-0000000000d7', '1/A');
insert into public.subjects (id, school_id, name) values
  ('d0000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d7', 'Math');
insert into public.class_subjects (id, school_id, class_id, subject_id, teacher_id) values
  ('e0000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d7', 'c0000000-0000-0000-0000-0000000000d7',
   'd0000000-0000-0000-0000-0000000000d7', '20000000-0000-0000-0000-0000000000d7');

create function pg_temp.act_as(p_user uuid, p_role text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', p_user, 'role', 'authenticated', 'user_role', p_role,
           'school_id', '00000000-0000-0000-0000-0000000000d7')::text, true);
$$;

select pg_temp.act_as('20000000-0000-0000-0000-0000000000d7', 'teacher');
insert into public.exams (id, school_id, class_id, class_subject_id, title, kind, mode, starts_at, max_score) values
  ('91000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d7', 'c0000000-0000-0000-0000-0000000000d7',
   'e0000000-0000-0000-0000-0000000000d7', 'Midterm', 'midterm', 'paper', now() + interval '3 days', 20);
select public.exam_transition('91000000-0000-0000-0000-0000000000d7', 'submit');

select pg_temp.act_as('10000000-0000-0000-0000-0000000000d7', 'school_admin');
select public.exam_transition('91000000-0000-0000-0000-0000000000d7', 'reject', 'Add chapter 4');

select pg_temp.act_as('20000000-0000-0000-0000-0000000000d7', 'teacher');
select is(
  (select data ->> 'event' || ':' || (data ->> 'note') from public.notifications where kind = 'exam'),
  'rejected:Add chapter 4', 'The author is told about the rejection, with the reason'
);
select lives_ok($$ update public.notifications set read_at = now() $$, 'Recipients mark notifications read');
select is((select count(*)::int from public.notifications where read_at is null), 0, 'They are read');

select public.exam_transition('91000000-0000-0000-0000-0000000000d7', 'submit');
select pg_temp.act_as('10000000-0000-0000-0000-0000000000d7', 'school_admin');
select public.exam_transition('91000000-0000-0000-0000-0000000000d7', 'approve');
select pg_temp.act_as('20000000-0000-0000-0000-0000000000d7', 'teacher');
select is((select count(*)::int from public.notifications where data ->> 'event' = 'approved'), 1,
  'The author is told about the approval');

select * from finish();
rollback;
