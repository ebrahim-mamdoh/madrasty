begin;
select plan(18);

-- Fixtures: class 1/A with Math (Teacher X), Student X and their parent; another teacher; an admin.
insert into public.schools (id, name, slug) values ('00000000-0000-0000-0000-0000000000b1', 'School X', 'school-x');
insert into public.school_features (school_id, feature_key) values
  ('00000000-0000-0000-0000-0000000000b1', 'exams'), ('00000000-0000-0000-0000-0000000000b1', 'online_exams');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('10000000-0000-0000-0000-0000000000b1', 'admin-x@test.local', '{"role":"school_admin","school_id":"00000000-0000-0000-0000-0000000000b1"}', '{"full_name":"Admin X"}'),
  ('20000000-0000-0000-0000-0000000000b1', 'teacher-x@test.local', '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000b1"}', '{"full_name":"Teacher X"}'),
  ('20000000-0000-0000-0000-0000000000b2', 'teacher-x2@test.local', '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000b1"}', '{"full_name":"Teacher X2"}'),
  ('30000000-0000-0000-0000-0000000000b1', 'student-x@test.local', '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000b1"}', '{"full_name":"Student X"}'),
  ('40000000-0000-0000-0000-0000000000b1', 'parent-x@test.local', '{"role":"parent","school_id":"00000000-0000-0000-0000-0000000000b1"}', '{"full_name":"Parent X"}');
insert into public.academic_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('a0000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '2026/2027', '2026-09-01', '2027-06-30', true);
insert into public.grade_levels (id, school_id, name, sort_order) values
  ('b0000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'G1', 1);
insert into public.classes (id, school_id, academic_year_id, grade_level_id, name) values
  ('c0000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-0000000000b1', 'b0000000-0000-0000-0000-0000000000b1', '1/A');
insert into public.subjects (id, school_id, name) values
  ('d0000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Math');
insert into public.class_subjects (id, school_id, class_id, subject_id, teacher_id) values
  ('e0000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-0000000000b1',
   'd0000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1');
insert into public.student_enrollments (school_id, student_id, class_id, academic_year_id) values
  ('00000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-0000000000b1');
insert into public.parent_students (school_id, parent_id, student_id) values
  ('00000000-0000-0000-0000-0000000000b1', '40000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-0000000000b1');

create function pg_temp.act_as(p_user uuid, p_role text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', p_user, 'role', 'authenticated', 'user_role', p_role,
           'school_id', '00000000-0000-0000-0000-0000000000b1')::text, true);
$$;

select pg_temp.act_as('20000000-0000-0000-0000-0000000000b2', 'teacher');
select throws_ok(
  $$ insert into public.exams (school_id, class_id, class_subject_id, title, kind, mode, starts_at, max_score)
     values ('00000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-0000000000b1',
             'e0000000-0000-0000-0000-0000000000b1', 'X', 'quiz', 'online', now(), 10) $$,
  '42501', null, 'Only the subject''s teacher creates exams'
);

select pg_temp.act_as('20000000-0000-0000-0000-0000000000b1', 'teacher');
select lives_ok(
  $$ insert into public.exams (id, school_id, class_id, class_subject_id, title, kind, mode, starts_at, duration_minutes, max_score)
     values ('91000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1',
             'c0000000-0000-0000-0000-0000000000b1', 'e0000000-0000-0000-0000-0000000000b1',
             'Quiz 1', 'quiz', 'online', now() - interval '1 minute', 30, 10) $$,
  'The teacher creates a draft'
);
select throws_ok(
  $$ update public.exams set status = 'approved' $$,
  '42501', null, 'The status cannot be changed directly'
);
select throws_ok(
  $$ select public.exam_transition('91000000-0000-0000-0000-0000000000b1', 'submit') $$,
  'MD008', null, 'An online exam needs questions before approval'
);
select throws_ok(
  $$ insert into public.exam_questions (school_id, exam_id, type, text, options, correct_answer)
     values ('00000000-0000-0000-0000-0000000000b1', '91000000-0000-0000-0000-0000000000b1', 'mcq', 'Q', '["a"]', '0') $$,
  'MD007', null, 'An MCQ needs at least two options'
);
insert into public.exam_questions (id, school_id, exam_id, position, type, text, options, correct_answer, points) values
  ('92000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '91000000-0000-0000-0000-0000000000b1', 1, 'mcq', '2+2?', '["3","4","5"]', '1', 4),
  ('92000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b1', '91000000-0000-0000-0000-0000000000b1', 2, 'true_false', 'Sky is blue', '[]', 'true', 3),
  ('92000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b1', '91000000-0000-0000-0000-0000000000b1', 3, 'short', 'Explain', '[]', null, 3);
select is(public.exam_transition('91000000-0000-0000-0000-0000000000b1', 'submit')::text, 'pending',
  'The teacher submits for approval');
select throws_ok(
  $$ select public.exam_transition('91000000-0000-0000-0000-0000000000b1', 'approve') $$,
  '42501', null, 'Teachers cannot approve'
);

select pg_temp.act_as('10000000-0000-0000-0000-0000000000b1', 'school_admin');
select throws_ok(
  $$ select public.exam_transition('91000000-0000-0000-0000-0000000000b1', 'reject') $$,
  'MD009', null, 'Rejecting needs a reason'
);
select is(public.exam_transition('91000000-0000-0000-0000-0000000000b1', 'approve')::text, 'approved',
  'An approver approves');

select pg_temp.act_as('30000000-0000-0000-0000-0000000000b1', 'student');
select is((select count(*)::int from public.notifications where kind = 'exam'), 1,
  'Students are told about the approved exam');
select is((select count(*)::int from public.exam_questions), 0, 'Students never read exam questions');
select ok(
  (select jsonb_array_length(p -> 'questions') = 3 and not (p -> 'questions' -> 0 ? 'correct_answer')
   from public.start_exam('91000000-0000-0000-0000-0000000000b1') as p),
  'The paper has the questions but no answers'
);
select is(
  public.submit_exam('91000000-0000-0000-0000-0000000000b1',
    '{"92000000-0000-0000-0000-0000000000b1": 1, "92000000-0000-0000-0000-0000000000b2": false}'),
  4.00, 'Auto-scoring counts the correct MCQ only'
);
select throws_ok(
  $$ select public.submit_exam('91000000-0000-0000-0000-0000000000b1', '{}'::jsonb) $$,
  'MD011', null, 'An exam is submitted once'
);
select is((select count(*)::int from public.exam_results), 0, 'Results stay hidden until published');

select pg_temp.act_as('20000000-0000-0000-0000-0000000000b1', 'teacher');
update public.exam_results set score = 6;
select public.exam_transition('91000000-0000-0000-0000-0000000000b1', 'publish');
update public.exam_results set score = 10;
select is((select score from public.exam_results), 6.00, 'The teacher cannot change a published result');

select pg_temp.act_as('40000000-0000-0000-0000-0000000000b1', 'parent');
select is((select score from public.exam_results), 6.00, 'Parents read the published result');
select is((select count(*)::int from public.notifications where kind = 'grade'), 1,
  'Parents are notified of the grade');

select * from finish();
rollback;
