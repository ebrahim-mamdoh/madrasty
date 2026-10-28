-- A teacher clash only exists across different classes. Within one class the slot's unique
-- constraint decides — otherwise replacing a slot's subject with another subject taught by the
-- same teacher (an upsert on the slot) was wrongly reported as "teacher busy".

drop trigger timetable_entries_check_teacher on public.timetable_entries;
drop trigger class_subjects_check_schedule on public.class_subjects;
drop function private.check_timetable_teacher();
drop function private.check_class_subject_schedule();
drop function private.teacher_busy(uuid, uuid, smallint, uuid, uuid);

/** Is `p_teacher` already teaching another class of the same academic year in this slot? */
create function private.teacher_busy(
  p_teacher uuid,
  p_year uuid,
  p_class uuid,
  p_weekday smallint,
  p_period uuid
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
      and te.class_id <> p_class
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
     and private.teacher_busy(v_teacher, v_year, new.class_id, new.weekday, new.period_id) then
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
      and private.teacher_busy(new.teacher_id, c.academic_year_id, te.class_id, te.weekday, te.period_id)
  ) then
    raise exception 'teacher_busy' using errcode = 'MD001';
  end if;
  return new;
end;
$$;

create trigger class_subjects_check_schedule
before update of teacher_id on public.class_subjects
for each row execute function private.check_class_subject_schedule();
