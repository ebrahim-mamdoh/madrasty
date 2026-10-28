-- =====================================================================
-- P2 — Timetable: school study days, daily periods, weekly entries per class.
--
-- Rules enforced here (not only in the UI):
--   * a class has at most one subject per (weekday, period)       → unique constraint
--   * a teacher is never in two classes at the same (day, period) → triggers, errcode MD001
--     (checked on new entries AND when a class subject changes teacher)
--   * a school's periods never overlap in time                    → trigger, errcode MD002
-- Weekdays follow JS Date#getDay: 0 = Sunday … 6 = Saturday.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Study days
-- ---------------------------------------------------------------------
alter table public.schools
  add column study_days smallint[] not null default '{0,1,2,3,4}'
  constraint schools_study_days_check
    check (study_days <@ '{0,1,2,3,4,5,6}'::smallint[] and cardinality(study_days) between 1 and 7);

/** Admin → Timetable: which weekdays the school teaches on. Needs structure.manage. */
create function public.set_school_study_days(p_days smallint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid := private.jwt_school_id();
begin
  if v_school_id is null or not private.has_permission('structure.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.schools
  set study_days = (select array_agg(distinct d order by d) from unnest(p_days) as d)
  where id = v_school_id;
end;
$$;

revoke execute on function public.set_school_study_days(smallint[]) from public, anon;
grant execute on function public.set_school_study_days(smallint[]) to authenticated;

-- ---------------------------------------------------------------------
-- Periods
-- ---------------------------------------------------------------------
create table public.periods (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  number     smallint not null check (number between 1 and 20),
  starts_at  time not null,
  ends_at    time not null,
  created_at timestamptz not null default now(),
  constraint periods_time_order check (ends_at > starts_at),
  constraint periods_school_number_key unique (school_id, number),
  constraint periods_id_school_key unique (id, school_id)
);

create function private.check_period_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.periods p
    where p.school_id = new.school_id
      and p.id <> new.id
      and p.starts_at < new.ends_at
      and new.starts_at < p.ends_at
  ) then
    raise exception 'period_overlap' using errcode = 'MD002';
  end if;
  return new;
end;
$$;

create trigger periods_check_overlap
before insert or update of starts_at, ends_at on public.periods
for each row execute function private.check_period_overlap();

-- ---------------------------------------------------------------------
-- Timetable entries
-- ---------------------------------------------------------------------
-- Lets an entry reference its class subject together with the class it belongs to.
alter table public.class_subjects
  add constraint class_subjects_id_class_school_key unique (id, class_id, school_id);

create table public.timetable_entries (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools (id) on delete cascade,
  class_id         uuid not null,
  class_subject_id uuid not null,
  weekday          smallint not null check (weekday between 0 and 6),
  period_id        uuid not null,
  created_at       timestamptz not null default now(),
  constraint timetable_entries_slot_key unique (class_id, weekday, period_id),
  -- A slot means nothing once its subject leaves the class: it goes with it.
  constraint timetable_entries_class_subject_fkey
    foreign key (class_subject_id, class_id, school_id)
    references public.class_subjects (id, class_id, school_id) on delete cascade,
  -- A period that is still scheduled cannot be deleted (checked at commit, see 121000).
  constraint timetable_entries_period_fkey
    foreign key (period_id, school_id)
    references public.periods (id, school_id) on delete no action deferrable initially deferred
);

create index timetable_entries_school_idx on public.timetable_entries (school_id);
create index timetable_entries_class_subject_idx
  on public.timetable_entries (class_subject_id, class_id, school_id);
create index timetable_entries_period_idx on public.timetable_entries (period_id, school_id);
create index timetable_entries_slot_idx on public.timetable_entries (weekday, period_id);

/** Is `p_teacher` already teaching another class of the same academic year in this slot? */
create function private.teacher_busy(
  p_teacher uuid,
  p_year uuid,
  p_weekday smallint,
  p_period uuid,
  p_except_entry uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.timetable_entries te
    join public.class_subjects cs on cs.id = te.class_subject_id
    join public.classes c on c.id = te.class_id
    where te.weekday = p_weekday
      and te.period_id = p_period
      and te.id is distinct from p_except_entry
      and cs.teacher_id = p_teacher
      and c.academic_year_id = p_year
  );
$$;

create function private.check_timetable_teacher()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_teacher uuid;
  v_year uuid;
begin
  select cs.teacher_id, c.academic_year_id
  into v_teacher, v_year
  from public.class_subjects cs
  join public.classes c on c.id = cs.class_id
  where cs.id = new.class_subject_id;

  if v_teacher is not null
     and private.teacher_busy(v_teacher, v_year, new.weekday, new.period_id, new.id) then
    raise exception 'teacher_busy' using errcode = 'MD001';
  end if;
  return new;
end;
$$;

create trigger timetable_entries_check_teacher
before insert or update on public.timetable_entries
for each row execute function private.check_timetable_teacher();

create function private.check_class_subject_schedule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.teacher_id is null or new.teacher_id is not distinct from old.teacher_id then
    return new;
  end if;

  if exists (
    select 1
    from public.timetable_entries te
    join public.classes c on c.id = te.class_id
    where te.class_subject_id = new.id
      and private.teacher_busy(new.teacher_id, c.academic_year_id, te.weekday, te.period_id, te.id)
  ) then
    raise exception 'teacher_busy' using errcode = 'MD001';
  end if;
  return new;
end;
$$;

create trigger class_subjects_check_schedule
before update of teacher_id on public.class_subjects
for each row execute function private.check_class_subject_schedule();

-- ---------------------------------------------------------------------
-- RLS: the timetable is readable by everyone in the school (teachers, students, parents);
-- changing it needs structure.manage. One SELECT policy per table (see 094000).
-- ---------------------------------------------------------------------
alter table public.periods enable row level security;
alter table public.timetable_entries enable row level security;

do $$
declare
  t text;
  manage text := 'school_id = (select private.jwt_school_id()) and (select private.has_permission(''structure.manage''))';
begin
  foreach t in array array['periods', 'timetable_entries']
  loop
    execute format(
      'create policy "%1$s: school members read" on public.%1$I for select to authenticated
         using (school_id = (select private.jwt_school_id()))',
      t
    );
    execute format(
      'create policy "%1$s: insert with structure.manage" on public.%1$I for insert to authenticated with check (%2$s)',
      t, manage
    );
    execute format(
      'create policy "%1$s: update with structure.manage" on public.%1$I for update to authenticated using (%2$s) with check (%2$s)',
      t, manage
    );
    execute format(
      'create policy "%1$s: delete with structure.manage" on public.%1$I for delete to authenticated using (%2$s)',
      t, manage
    );
  end loop;
end;
$$;
