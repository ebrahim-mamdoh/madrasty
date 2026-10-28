-- Students and parents need to see who teaches each subject (timetable, "my subjects"), but the
-- profiles RLS rightly hides teachers' rows (email, phone) from them. This returns only id + name
-- of the teachers of one class, and only inside the caller's own school.
create function public.class_teachers(p_class_id uuid)
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id, p.full_name
  from public.class_subjects cs
  join public.profiles p on p.id = cs.teacher_id
  where cs.class_id = p_class_id
    and cs.school_id = private.jwt_school_id();
$$;

revoke execute on function public.class_teachers(uuid) from public, anon;
grant execute on function public.class_teachers(uuid) to authenticated;
