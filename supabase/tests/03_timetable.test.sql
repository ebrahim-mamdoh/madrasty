begin;
select plan(10);

-- Fixtures: one school, one year, two classes, one teacher teaching math in both.
insert into public.schools (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000e1', 'School E', 'school-e');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('10000000-0000-0000-0000-0000000000e1', 'admin-e@test.local',
   '{"role":"school_admin","school_id":"00000000-0000-0000-0000-0000000000e1"}', '{"full_name":"Admin E"}'),
  ('20000000-0000-0000-0000-0000000000e1', 'teacher-e@test.local',
   '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000e1"}', '{"full_name":"Teacher E"}'),
  ('20000000-0000-0000-0000-0000000000e2', 'teacher-e2@test.local',
   '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000e1"}', '{"full_name":"Teacher E2"}');
insert into public.academic_years (id, school_id, name, starts_on, ends_on) values
  ('a0000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1', '2026/2027', '2026-09-01', '2027-06-30');
insert into public.grade_levels (id, school_id, name, sort_order) values
  ('b0000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1', 'G1', 1);
insert into public.classes (id, school_id, academic_year_id, grade_level_id, name) values
  ('c0000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1',
   'a0000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000e1', '1/A'),
  ('c0000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e1',
   'a0000000-0000-0000-0000-0000000000e1', 'b0000000-0000-0000-0000-0000000000e1', '1/B');
insert into public.subjects (id, school_id, name) values
  ('d0000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1', 'Math'),
  ('d0000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e1', 'Science');
insert into public.class_subjects (id, school_id, class_id, subject_id, teacher_id) values
  ('e0000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1',
   'c0000000-0000-0000-0000-0000000000e1', 'd0000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000e1'),
  ('e0000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e1',
   'c0000000-0000-0000-0000-0000000000e2', 'd0000000-0000-0000-0000-0000000000e1', '20000000-0000-0000-0000-0000000000e1'),
  ('e0000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e1',
   'c0000000-0000-0000-0000-0000000000e2', 'd0000000-0000-0000-0000-0000000000e2', '20000000-0000-0000-0000-0000000000e2'),
  ('e0000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e1',
   'c0000000-0000-0000-0000-0000000000e1', 'd0000000-0000-0000-0000-0000000000e2', '20000000-0000-0000-0000-0000000000e1');
insert into public.periods (id, school_id, number, starts_at, ends_at) values
  ('f0000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1', 1, '08:00', '08:45');

-- Act as Admin E.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub', '10000000-0000-0000-0000-0000000000e1', 'role', 'authenticated',
  'user_role', 'school_admin', 'school_id', '00000000-0000-0000-0000-0000000000e1'
)::text, true);

select throws_ok(
  $$ insert into public.periods (school_id, number, starts_at, ends_at)
     values ('00000000-0000-0000-0000-0000000000e1', 2, '08:30', '09:15') $$,
  'MD002', null, 'Overlapping periods are refused'
);
select lives_ok(
  $$ insert into public.timetable_entries (school_id, class_id, class_subject_id, weekday, period_id)
     values ('00000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e1',
             'e0000000-0000-0000-0000-0000000000e1', 0, 'f0000000-0000-0000-0000-0000000000e1') $$,
  'Math is scheduled for 1/A on Sunday, period 1'
);
select throws_ok(
  $$ insert into public.timetable_entries (school_id, class_id, class_subject_id, weekday, period_id)
     values ('00000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e2',
             'e0000000-0000-0000-0000-0000000000e2', 0, 'f0000000-0000-0000-0000-0000000000e1') $$,
  'MD001', null, 'The same teacher cannot be in 1/B at the same time'
);
select lives_ok(
  $$ insert into public.timetable_entries (school_id, class_id, class_subject_id, weekday, period_id)
     values ('00000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e2',
             'e0000000-0000-0000-0000-0000000000e3', 0, 'f0000000-0000-0000-0000-0000000000e1') $$,
  'Another teacher can take 1/B in that slot'
);
select throws_ok(
  $$ insert into public.timetable_entries (school_id, class_id, class_subject_id, weekday, period_id)
     values ('00000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e1',
             'e0000000-0000-0000-0000-0000000000e1', 0, 'f0000000-0000-0000-0000-0000000000e1') $$,
  '23505', null, 'A class slot holds one subject'
);
select throws_ok(
  $$ insert into public.timetable_entries (school_id, class_id, class_subject_id, weekday, period_id)
     values ('00000000-0000-0000-0000-0000000000e1', 'c0000000-0000-0000-0000-0000000000e1',
             'e0000000-0000-0000-0000-0000000000e3', 1, 'f0000000-0000-0000-0000-0000000000e1') $$,
  '23503', null, 'An entry cannot use a subject of another class'
);
select lives_ok(
  $$ update public.timetable_entries set class_subject_id = 'e0000000-0000-0000-0000-0000000000e4'
     where class_id = 'c0000000-0000-0000-0000-0000000000e1' and weekday = 0 $$,
  'A slot can switch to another subject of the same teacher'
);
select throws_ok(
  $$ update public.class_subjects set teacher_id = '20000000-0000-0000-0000-0000000000e1'
     where id = 'e0000000-0000-0000-0000-0000000000e3' $$,
  'MD001', null, 'Reassigning a teacher into a clash is refused'
);
-- The period FK is deferred to commit; check it now so the test can observe it.
set constraints all immediate;
select throws_ok(
  $$ delete from public.periods where id = 'f0000000-0000-0000-0000-0000000000e1' $$,
  '23503', null, 'A scheduled period cannot be deleted'
);

-- Act as Teacher E: can read, cannot write.
select set_config('request.jwt.claims', json_build_object(
  'sub', '20000000-0000-0000-0000-0000000000e1', 'role', 'authenticated',
  'user_role', 'teacher', 'school_id', '00000000-0000-0000-0000-0000000000e1'
)::text, true);
select throws_ok(
  $$ insert into public.periods (school_id, number, starts_at, ends_at)
     values ('00000000-0000-0000-0000-0000000000e1', 5, '12:00', '12:45') $$,
  '42501', null, 'Teachers cannot change the timetable'
);

select * from finish();
rollback;
