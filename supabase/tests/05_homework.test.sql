begin;
select plan(12);

-- Fixtures: class 1/A (Math by Teacher H; students H and H3, H3's parent), class 1/B (student H2).
insert into public.schools (id, name, slug) values ('00000000-0000-0000-0000-0000000000a1', 'School H', 'school-h');
insert into public.school_features (school_id, feature_key) values ('00000000-0000-0000-0000-0000000000a1', 'homework');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('20000000-0000-0000-0000-0000000000a1', 'teacher-h@test.local', '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000a1"}', '{"full_name":"Teacher H"}'),
  ('20000000-0000-0000-0000-0000000000a2', 'teacher-h2@test.local', '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000a1"}', '{"full_name":"Teacher H2"}'),
  ('30000000-0000-0000-0000-0000000000a1', 'student-h@test.local', '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000a1"}', '{"full_name":"Student H"}'),
  ('30000000-0000-0000-0000-0000000000a2', 'student-h2@test.local', '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000a1"}', '{"full_name":"Student H2"}'),
  ('30000000-0000-0000-0000-0000000000a3', 'student-h3@test.local', '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000a1"}', '{"full_name":"Student H3"}'),
  ('40000000-0000-0000-0000-0000000000a1', 'parent-h@test.local', '{"role":"parent","school_id":"00000000-0000-0000-0000-0000000000a1"}', '{"full_name":"Parent H"}');
insert into public.academic_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('a0000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '2026/2027', '2026-09-01', '2027-06-30', true);
insert into public.grade_levels (id, school_id, name, sort_order) values
  ('b0000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'G1', 1);
insert into public.classes (id, school_id, academic_year_id, grade_level_id, name) values
  ('c0000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1', 'b0000000-0000-0000-0000-0000000000a1', '1/A'),
  ('c0000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1', 'b0000000-0000-0000-0000-0000000000a1', '1/B');
insert into public.subjects (id, school_id, name) values
  ('d0000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Math');
insert into public.class_subjects (id, school_id, class_id, subject_id, teacher_id) values
  ('e0000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-0000000000a1',
   'd0000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1');
insert into public.student_enrollments (school_id, student_id, class_id, academic_year_id) values
  ('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a3', 'c0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a2', 'c0000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-0000000000a1');
insert into public.parent_students (school_id, parent_id, student_id) values
  ('00000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-0000000000a3');

create function pg_temp.act_as(p_user uuid, p_role text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', p_user, 'role', 'authenticated', 'user_role', p_role,
           'school_id', '00000000-0000-0000-0000-0000000000a1')::text, true);
$$;

select pg_temp.act_as('20000000-0000-0000-0000-0000000000a2', 'teacher');
select throws_ok(
  $$ insert into public.homework (school_id, class_id, class_subject_id, title, due_at, max_score)
     values ('00000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-0000000000a1',
             'e0000000-0000-0000-0000-0000000000a1', 'HW', now() + interval '1 day', 10) $$,
  '42501', null, 'Only the subject''s teacher assigns homework'
);

select pg_temp.act_as('20000000-0000-0000-0000-0000000000a1', 'teacher');
select lives_ok(
  $$ insert into public.homework (id, school_id, class_id, class_subject_id, title, due_at, max_score)
     values ('90000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1',
             'c0000000-0000-0000-0000-0000000000a1', 'e0000000-0000-0000-0000-0000000000a1',
             'HW', now() + interval '1 day', 10) $$,
  'The subject teacher assigns homework'
);

select pg_temp.act_as('30000000-0000-0000-0000-0000000000a1', 'student');
select is((select count(*)::int from public.notifications where kind = 'homework'), 1,
  'Students are notified of new homework');
select lives_ok(
  $$ insert into public.homework_submissions (school_id, homework_id, student_id, body, score)
     values ('00000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-0000000000a1',
             '30000000-0000-0000-0000-0000000000a1', 'my answer', 10) $$,
  'A student submits'
);
select is((select score from public.homework_submissions), null, 'A student cannot grade themselves');

select pg_temp.act_as('30000000-0000-0000-0000-0000000000a2', 'student');
select is((select count(*)::int from public.homework), 0, 'Other classes do not see the homework');
select throws_ok(
  $$ insert into public.homework_submissions (school_id, homework_id, student_id, body)
     values ('00000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-0000000000a1',
             '30000000-0000-0000-0000-0000000000a2', 'x') $$,
  'MD003', null, 'Other classes cannot submit'
);

select pg_temp.act_as('20000000-0000-0000-0000-0000000000a1', 'teacher');
select throws_ok(
  $$ update public.homework_submissions set score = 11 $$,
  'MD006', null, 'Scores above the maximum are refused'
);
update public.homework_submissions set score = 9, feedback = 'good', body = 'tampered';
select is((select body || '|' || score::text from public.homework_submissions), 'my answer|9.00',
  'The grader sets the grade but cannot change the answer');

select pg_temp.act_as('30000000-0000-0000-0000-0000000000a1', 'student');
select is(
  (select count(*)::int from public.notifications where kind = 'homework' and data ->> 'event' = 'graded'),
  1, 'The student is notified of the grade'
);
update public.homework_submissions set body = 'changed';
select is((select body from public.homework_submissions), 'my answer', 'A graded submission is locked');

-- Past due: the parent of the student who did not submit is alerted.
reset role;
update public.homework set due_at = now() - interval '1 hour';
select private.notify_missing_homework();
select is(
  (select count(*)::int from public.notifications
   where kind = 'homework_missing' and recipient_id = '40000000-0000-0000-0000-0000000000a1'),
  1, 'Parents are alerted when homework is missing after the due date'
);

select * from finish();
rollback;
