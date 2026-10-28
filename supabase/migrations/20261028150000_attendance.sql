-- =====================================================================
-- P3 — Attendance (daily, per class) + the notifications inbox it feeds.
--
--   * one record per student per day (unique)
--   * a class's teachers record TODAY (school time zone); holders of attendance.record any past day
--   * the student must be enrolled in that class; future dates are refused
--   * marking a child absent notifies their parents; correcting it before they read it
--     withdraws the notification
-- =====================================================================

create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');

/** Today's date in the caller's school time zone (UTC when unknown). */
create function private.school_today()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select s.timezone from public.schools s where s.id = private.jwt_school_id()),
    'UTC'
  ))::date;
$$;

grant execute on function private.school_today() to authenticated;

create table public.attendance_records (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  student_id  uuid not null,
  class_id    uuid not null,
  date        date not null,
  status      public.attendance_status not null,
  note        text check (char_length(note) <= 200),
  recorded_by uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint attendance_records_student_date_key unique (student_id, date),
  foreign key (student_id, school_id) references public.profiles (id, school_id) on delete cascade,
  -- A class with attendance history cannot be deleted (checked at commit, see 121000).
  constraint attendance_records_class_fkey
    foreign key (class_id, school_id)
    references public.classes (id, school_id) on delete no action deferrable initially deferred,
  foreign key (recorded_by, school_id)
    references public.profiles (id, school_id) on delete set null (recorded_by)
);

create index attendance_records_class_date_idx on public.attendance_records (class_id, date);
create index attendance_records_school_date_idx on public.attendance_records (school_id, date);
create index attendance_records_class_school_idx on public.attendance_records (class_id, school_id);
create index attendance_records_recorder_idx on public.attendance_records (recorded_by, school_id);

create function private.check_attendance_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.student_enrollments se
    where se.student_id = new.student_id and se.class_id = new.class_id
  ) then
    raise exception 'student_not_in_class' using errcode = 'MD003';
  end if;
  if new.date > private.school_today() then
    raise exception 'future_date' using errcode = 'MD004';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger attendance_records_check
before insert or update on public.attendance_records
for each row execute function private.check_attendance_record();

alter table public.attendance_records enable row level security;

create policy "attendance_records: read" on public.attendance_records for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (
    (select private.has_permission('attendance.view'))
    or class_id in (select private.teacher_class_ids())
    or student_id = (select auth.uid())
    or student_id in (select private.parent_student_ids())
  )
);

-- Same rule for insert and update: managers any day, the class's teachers today only.
create policy "attendance_records: insert" on public.attendance_records for insert to authenticated
with check (
  school_id = (select private.jwt_school_id())
  and recorded_by = (select auth.uid())
  and (
    (select private.has_permission('attendance.record'))
    or (class_id in (select private.teacher_class_ids()) and date = (select private.school_today()))
  )
);

create policy "attendance_records: update" on public.attendance_records for update to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (
    (select private.has_permission('attendance.record'))
    or (class_id in (select private.teacher_class_ids()) and date = (select private.school_today()))
  )
)
with check (
  school_id = (select private.jwt_school_id())
  and recorded_by = (select auth.uid())
  and (
    (select private.has_permission('attendance.record'))
    or (class_id in (select private.teacher_class_ids()) and date = (select private.school_today()))
  )
);

create policy "attendance_records: delete" on public.attendance_records for delete to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('attendance.record'))
);

/**
 * Per-student counts for one class over a date range. Runs as the caller, so RLS decides what
 * is counted (managers: the whole class; teachers: their classes).
 */
create function public.attendance_summary(p_class_id uuid, p_from date, p_to date)
returns table (
  student_id uuid,
  full_name text,
  present integer,
  absent integer,
  late integer,
  excused integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    se.student_id,
    p.full_name,
    (count(*) filter (where ar.status = 'present'))::integer,
    (count(*) filter (where ar.status = 'absent'))::integer,
    (count(*) filter (where ar.status = 'late'))::integer,
    (count(*) filter (where ar.status = 'excused'))::integer
  from public.student_enrollments se
  join public.profiles p on p.id = se.student_id
  left join public.attendance_records ar
    on ar.student_id = se.student_id
   and ar.class_id = se.class_id
   and ar.date between p_from and p_to
  where se.class_id = p_class_id
  group by se.student_id, p.full_name
  order by p.full_name;
$$;

revoke execute on function public.attendance_summary(uuid, date, date) from public, anon;
grant execute on function public.attendance_summary(uuid, date, date) to authenticated;

-- ---------------------------------------------------------------------
-- Notifications inbox (web bell in P7, push on mobile). Rows are written only by triggers;
-- recipients can read theirs and mark them read — nothing else.
-- ---------------------------------------------------------------------
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  recipient_id uuid not null,
  kind         text not null check (kind in (
                 'absence', 'grade', 'homework', 'homework_missing', 'exam', 'monthly_report'
               )),
  data         jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  foreign key (recipient_id, school_id) references public.profiles (id, school_id) on delete cascade
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_school_idx on public.notifications (recipient_id, school_id);
create index notifications_school_idx on public.notifications (school_id);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications: recipient reads" on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

create policy "notifications: recipient marks read" on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

-- Only the read marker may change.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create function private.notify_absence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if new.status = 'absent' and (tg_op = 'INSERT' or old.status is distinct from 'absent') then
    select p.full_name into v_name from public.profiles p where p.id = new.student_id;
    insert into public.notifications (school_id, recipient_id, kind, data)
    select new.school_id, ps.parent_id, 'absence',
           jsonb_build_object('student_id', new.student_id, 'student_name', v_name, 'date', new.date)
    from public.parent_students ps
    where ps.student_id = new.student_id;
  elsif tg_op = 'UPDATE' and old.status = 'absent' and new.status <> 'absent' then
    -- Corrected before the parent saw it: withdraw the alert.
    delete from public.notifications n
    where n.kind = 'absence'
      and n.read_at is null
      and n.data ->> 'student_id' = new.student_id::text
      and n.data ->> 'date' = new.date::text;
  end if;
  return null;
end;
$$;

create trigger attendance_records_notify
after insert or update of status on public.attendance_records
for each row execute function private.notify_absence();
