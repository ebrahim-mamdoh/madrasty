-- An online submission records the student's own result through submit_exam; that result was
-- auto-scored, not "recorded by" the student. Leave the recorder empty in that case.
create or replace function private.check_exam_result()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max numeric;
  v_class uuid;
begin
  select e.max_score, e.class_id into v_max, v_class from public.exams e where e.id = new.exam_id;
  if new.score > v_max then
    raise exception 'score_above_max' using errcode = 'MD006';
  end if;
  if not exists (
    select 1 from public.student_enrollments se
    where se.student_id = new.student_id and se.class_id = v_class
  ) then
    raise exception 'student_not_in_class' using errcode = 'MD003';
  end if;
  new.recorded_by := case
    when auth.uid() = new.student_id then null
    else coalesce(auth.uid(), new.recorded_by)
  end;
  new.updated_at := now();
  return new;
end;
$$;
