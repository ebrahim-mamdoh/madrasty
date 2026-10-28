-- Attachments follow the same plan gate as the homework rows: with the `homework` feature off,
-- signed download links are refused too.
create or replace function private.can_read_homework_object(p_name text)
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
    return exists (
      select 1 from public.homework h
      where h.id = v_homework
        and (
          private.has_permission('homework.view')
          or h.class_id in (select private.teacher_class_ids())
          or h.class_id in (select private.student_class_ids())
          or h.class_id in (select private.parent_class_ids())
        )
    );
  elsif v_parts[2] = 'submissions' then
    return v_parts[4] = auth.uid()::text
      or exists (
        select 1 from private.parent_student_ids() as child (id) where child.id::text = v_parts[4]
      )
      or private.has_permission('homework.view')
      or private.can_grade_homework(v_homework);
  end if;
  return false;
end;
$$;
