begin;
select plan(11);

-- Fixtures: a class with its teacher, an enrolled student with a parent, another class's teacher.
insert into public.schools (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f1', 'School F', 'school-f');
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('10000000-0000-0000-0000-0000000000f1', 'admin-f@test.local',
   '{"role":"school_admin","school_id":"00000000-0000-0000-0000-0000000000f1"}', '{"full_name":"Admin F"}'),
  ('20000000-0000-0000-0000-0000000000f1', 'teacher-f@test.local',
   '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000f1"}', '{"full_name":"Teacher F"}'),
  ('20000000-0000-0000-0000-0000000000f2', 'teacher-f2@test.local',
   '{"role":"teacher","school_id":"00000000-0000-0000-0000-0000000000f1"}', '{"full_name":"Teacher F2"}'),
  ('30000000-0000-0000-0000-0000000000f1', 'student-f@test.local',
   '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000f1"}', '{"full_name":"Student F"}'),
  ('30000000-0000-0000-0000-0000000000f2', 'student-f2@test.local',
   '{"role":"student","school_id":"00000000-0000-0000-0000-0000000000f1"}', '{"full_name":"Student F2"}'),
  ('40000000-0000-0000-0000-0000000000f1', 'parent-f@test.local',
   '{"role":"parent","school_id":"00000000-0000-0000-0000-0000000000f1"}', '{"full_name":"Parent F"}');
insert into public.academic_years (id, school_id, name, starts_on, ends_on, is_current) values
  ('a0000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1', '2026/2027', '2026-09-01', '2027-06-30', true);
insert into public.grade_levels (id, school_id, name, sort_order) values
  ('b0000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1', 'G1', 1);
insert into public.classes (id, school_id, academic_year_id, grade_level_id, name, homeroom_teacher_id) values
  ('c0000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1',
   'a0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-0000000000f1', '1/A',
   '20000000-0000-0000-0000-0000000000f1'),
  ('c0000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1',
   'a0000000-0000-0000-0000-0000000000f1', 'b0000000-0000-0000-0000-0000000000f1', '1/B',
   '20000000-0000-0000-0000-0000000000f2');
insert into public.student_enrollments (school_id, student_id, class_id, academic_year_id) values
  ('00000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f1',
   'c0000000-0000-0000-0000-0000000000f1', 'a0000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f2',
   'c0000000-0000-0000-0000-0000000000f2', 'a0000000-0000-0000-0000-0000000000f1');
insert into public.parent_students (school_id, parent_id, student_id) values
  ('00000000-0000-0000-0000-0000000000f1', '40000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f1');

create function pg_temp.act_as(p_user uuid, p_role text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', p_user, 'role', 'authenticated', 'user_role', p_role,
           'school_id', '00000000-0000-0000-0000-0000000000f1')::text, true);
$$;

-- Teacher F (homeroom of 1/A)
select pg_temp.act_as('20000000-0000-0000-0000-0000000000f1', 'teacher');
select lives_ok(
  $$ insert into public.attendance_records (school_id, student_id, class_id, date, status)
     values ('00000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f1',
             'c0000000-0000-0000-0000-0000000000f1', private.school_today(), 'absent') $$,
  'The class teacher records today'
);
select throws_ok(
  $$ insert into public.attendance_records (school_id, student_id, class_id, date, status)
     values ('00000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f1',
             'c0000000-0000-0000-0000-0000000000f1', private.school_today() - 1, 'present') $$,
  '42501', null, 'A teacher cannot back-fill past days'
);
select throws_ok(
  $$ insert into public.attendance_records (school_id, student_id, class_id, date, status)
     values ('00000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f2',
             'c0000000-0000-0000-0000-0000000000f2', private.school_today(), 'present') $$,
  '42501', null, 'A teacher cannot record another class'
);

-- Parent F sees the alert and the record.
select pg_temp.act_as('40000000-0000-0000-0000-0000000000f1', 'parent');
select is((select count(*)::int from public.notifications where kind = 'absence'), 1,
  'Marking a child absent notifies the parent');
select is((select count(*)::int from public.attendance_records), 1, 'The parent reads their child''s record');
select throws_ok(
  $$ update public.notifications set kind = 'grade' $$,
  '42501', null, 'Recipients can only change the read marker'
);

-- Student F2 sees nothing of Student F.
select pg_temp.act_as('30000000-0000-0000-0000-0000000000f2', 'student');
select is((select count(*)::int from public.attendance_records), 0, 'Students only see their own records');

-- Admin F: any past day, but never the future or a student outside the class.
select pg_temp.act_as('10000000-0000-0000-0000-0000000000f1', 'school_admin');
select lives_ok(
  $$ insert into public.attendance_records (school_id, student_id, class_id, date, status)
     values ('00000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f1',
             'c0000000-0000-0000-0000-0000000000f1', private.school_today() - 1, 'late') $$,
  'A manager back-fills a past day'
);
select throws_ok(
  $$ insert into public.attendance_records (school_id, student_id, class_id, date, status)
     values ('00000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f1',
             'c0000000-0000-0000-0000-0000000000f1', private.school_today() + 1, 'present') $$,
  'MD004', null, 'Future dates are refused'
);
select throws_ok(
  $$ insert into public.attendance_records (school_id, student_id, class_id, date, status)
     values ('00000000-0000-0000-0000-0000000000f1', '30000000-0000-0000-0000-0000000000f2',
             'c0000000-0000-0000-0000-0000000000f1', private.school_today(), 'present') $$,
  'MD003', null, 'The student must belong to the class'
);

-- Correcting the absence withdraws the unread alert.
update public.attendance_records set status = 'present'
where student_id = '30000000-0000-0000-0000-0000000000f1' and date = private.school_today();
select pg_temp.act_as('40000000-0000-0000-0000-0000000000f1', 'parent');
select is((select count(*)::int from public.notifications where kind = 'absence'), 0,
  'A corrected absence withdraws the unread alert');

select * from finish();
rollback;
