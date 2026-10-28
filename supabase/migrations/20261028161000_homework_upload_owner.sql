-- Uploads into an existing homework's folder are reserved to those who can grade it. Before, any
-- teacher of the school could drop files into another teacher's homework folder; only the folder of a
-- homework that doesn't exist yet (files are uploaded before the row is created) stays open to teachers.
create or replace function private.can_write_homework_object(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := storage.foldername(p_name);
  v_homework uuid;
begin
  if v_parts[1] is distinct from private.jwt_school_id()::text
     or not private.has_feature('homework') then
    return false;
  end if;
  begin
    v_homework := v_parts[3]::uuid;
  exception when others then
    return false;
  end;

  if v_parts[2] = 'homework' then
    if exists (select 1 from public.homework h where h.id = v_homework) then
      return private.can_grade_homework(v_homework);
    end if;
    return private.has_permission('homework.manage')
      or exists (select 1 from public.class_subjects cs where cs.teacher_id = auth.uid());
  elsif v_parts[2] = 'submissions' then
    return v_parts[4] = auth.uid()::text
      and exists (
        select 1 from public.homework h
        where h.id = v_homework and h.class_id in (select private.student_class_ids())
      );
  end if;
  return false;
end;
$$;
