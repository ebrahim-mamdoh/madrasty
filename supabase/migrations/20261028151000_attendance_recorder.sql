-- `recorded_by` is "who last set this record". Stamp it from the session on every write, so a
-- manager correcting a teacher's record passes the policy's `recorded_by = auth.uid()` check.
create or replace function private.check_attendance_record()
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
  new.recorded_by := coalesce(auth.uid(), new.recorded_by);
  new.updated_at := now();
  return new;
end;
$$;
