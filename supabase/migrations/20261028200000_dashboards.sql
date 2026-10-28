-- =====================================================================
-- P8 — Dashboards and teacher monitoring.
--
--   * admin_dashboard / teacher_dashboard run as the caller (security invoker): every count is
--     what that user may see under RLS (feature-gated modules simply count as zero)
--   * teacher_monitoring needs monitoring.view and reads across modules for the whole school
-- =====================================================================

/** The admin home: today's attendance, people and what needs attention this week. */
create function public.admin_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with year as (
    select y.id from public.academic_years y where y.is_current limit 1
  ),
  today as (
    select private.school_today() as d
  ),
  attendance as (
    select ar.status, ar.class_id
    from public.attendance_records ar
    where ar.date = (select d from today)
  )
  select jsonb_build_object(
    'students', (select count(*) from public.student_enrollments se where se.academic_year_id = (select id from year)),
    'teachers', (select count(*) from public.profiles p where p.role = 'teacher' and p.is_active),
    'classes', (select count(*) from public.classes c where c.academic_year_id = (select id from year)),
    'attendance', jsonb_build_object(
      'present', (select count(*) from attendance where status = 'present'),
      'absent', (select count(*) from attendance where status = 'absent'),
      'late', (select count(*) from attendance where status = 'late'),
      'excused', (select count(*) from attendance where status = 'excused'),
      'classes_recorded', (select count(distinct class_id) from attendance)
    ),
    'is_study_day', (
      select extract(dow from (select d from today))::smallint = any (s.study_days)
      from public.schools s where s.id = private.jwt_school_id()
    ),
    'exams_pending', (select count(*) from public.exams e where e.status = 'pending'),
    'exams_upcoming', (
      select count(*) from public.exams e
      where e.status = 'approved' and e.starts_at between now() and now() + interval '7 days'
    ),
    'homework_due', (
      select count(*) from public.homework h where h.due_at between now() and now() + interval '7 days'
    ),
    'reports_sent', (
      select count(*) from public.monthly_reports r
      where r.status = 'sent' and r.month = date_trunc('month', (select d from today))::date
    )
  );
$$;

/** The teacher home: today's lessons, classes still waiting for attendance, grading and exams. */
create function public.teacher_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with year as (
    select y.id from public.academic_years y where y.is_current limit 1
  ),
  today as (
    select private.school_today() as d
  ),
  mine as (
    select cs.id, cs.class_id
    from public.class_subjects cs
    join public.classes c on c.id = cs.class_id
    where cs.teacher_id = auth.uid() and c.academic_year_id = (select id from year)
  ),
  my_classes as (
    select class_id from mine
    union
    select c.id from public.classes c
    where c.homeroom_teacher_id = auth.uid() and c.academic_year_id = (select id from year)
  )
  select jsonb_build_object(
    'lessons_today', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'period', p.number, 'starts_at', p.starts_at, 'ends_at', p.ends_at,
        'class', c.name, 'subject', s.name
      ) order by p.number), '[]'::jsonb)
      from public.timetable_entries te
      join mine on mine.id = te.class_subject_id
      join public.periods p on p.id = te.period_id
      join public.classes c on c.id = te.class_id
      join public.class_subjects cs on cs.id = te.class_subject_id
      join public.subjects s on s.id = cs.subject_id
      where te.weekday = extract(dow from (select d from today))
    ),
    'attendance_pending', (
      select coalesce(jsonb_agg(jsonb_build_object('class_id', c.id, 'class', c.name) order by c.name), '[]'::jsonb)
      from public.classes c
      where c.id in (select class_id from my_classes)
        and exists (
          select 1 from public.schools s
          where s.id = private.jwt_school_id()
            and extract(dow from (select d from today))::smallint = any (s.study_days)
        )
        and not exists (
          select 1 from public.attendance_records ar
          where ar.class_id = c.id and ar.date = (select d from today)
        )
    ),
    'to_grade', (
      select count(*)
      from public.homework_submissions hs
      join public.homework h on h.id = hs.homework_id
      where h.class_subject_id in (select id from mine) and hs.graded_at is null
    ),
    'upcoming_exams', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'status', e.status, 'class', c.name
      ) order by e.starts_at), '[]'::jsonb)
      from public.exams e
      join public.classes c on c.id = e.class_id
      where e.class_subject_id in (select id from mine)
        and e.status <> 'published'
        and e.starts_at between now() and now() + interval '14 days'
    ),
    'exams_to_publish', (
      select count(*) from public.exams e
      where e.class_subject_id in (select id from mine) and e.status = 'approved' and e.starts_at < now()
    )
  );
$$;

/**
 * Admin → Monitoring: per active teacher, how up to date they are this month.
 * Reads across modules for the whole school, so it requires monitoring.view.
 */
create function public.teacher_monitoring()
returns table (
  teacher_id uuid,
  full_name text,
  classes integer,
  attendance_days integer,
  last_attendance_at timestamptz,
  ungraded integer,
  exams_unpublished integer,
  reports_pending integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_school uuid := private.jwt_school_id();
  v_year uuid;
  v_month date := date_trunc('month', private.school_today())::date;
begin
  if v_school is null or not private.has_permission('monitoring.view') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select y.id into v_year from public.academic_years y
  where y.school_id = v_school and y.is_current limit 1;

  return query
  select
    p.id,
    p.full_name,
    (select count(distinct cs.class_id)::integer
       from public.class_subjects cs join public.classes c on c.id = cs.class_id
      where cs.teacher_id = p.id and c.academic_year_id = v_year),
    (select count(distinct (ar.class_id, ar.date))::integer
       from public.attendance_records ar
      where ar.recorded_by = p.id and ar.date >= v_month),
    (select max(ar.updated_at) from public.attendance_records ar where ar.recorded_by = p.id),
    (select count(*)::integer
       from public.homework_submissions hs
       join public.homework h on h.id = hs.homework_id
       join public.class_subjects cs on cs.id = h.class_subject_id
      where cs.teacher_id = p.id and hs.graded_at is null),
    (select count(*)::integer
       from public.exams e join public.class_subjects cs on cs.id = e.class_subject_id
      where cs.teacher_id = p.id and e.status = 'approved' and e.starts_at < now()),
    (select count(*)::integer
       from public.student_enrollments se
       join public.classes c on c.id = se.class_id
      where c.homeroom_teacher_id = p.id
        and c.academic_year_id = v_year
        and not exists (
          select 1 from public.monthly_reports r
          where r.student_id = se.student_id and r.month = v_month and r.status = 'sent'
        ))
  from public.profiles p
  where p.school_id = v_school and p.role = 'teacher' and p.is_active
  order by p.full_name;
end;
$$;

revoke execute on function public.admin_dashboard() from public, anon;
revoke execute on function public.teacher_dashboard() from public, anon;
revoke execute on function public.teacher_monitoring() from public, anon;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.teacher_dashboard() to authenticated;
grant execute on function public.teacher_monitoring() to authenticated;
