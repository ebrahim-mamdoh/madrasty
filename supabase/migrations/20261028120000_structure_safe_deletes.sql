-- =====================================================================
-- Academic structure: safe deletes + atomic "current year" switch.
--
-- Before: deleting an academic year silently CASCADE-deleted its classes
-- and every student enrollment in them; deleting a class wiped its
-- enrollments. Conversely, RESTRICT on grade_levels/subjects made deleting
-- a whole school fail, because RESTRICT is checked before the school's own
-- cascades remove the referencing classes.
--
-- After: NO ACTION everywhere a user-facing delete could destroy data.
-- NO ACTION is checked at the end of the statement, so:
--   * deleting a year that still has classes            → rejected (23503)
--   * deleting a class that still has enrolled students → rejected (23503)
--   * deleting a grade level / subject still in use     → rejected (23503)
--   * deleting a whole school                           → still cascades cleanly
-- =====================================================================

alter table public.classes
  drop constraint classes_academic_year_id_school_id_fkey,
  add constraint classes_academic_year_id_school_id_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years (id, school_id) on delete no action;

alter table public.classes
  drop constraint classes_grade_level_id_school_id_fkey,
  add constraint classes_grade_level_id_school_id_fkey
    foreign key (grade_level_id, school_id)
    references public.grade_levels (id, school_id) on delete no action;

alter table public.class_subjects
  drop constraint class_subjects_subject_id_school_id_fkey,
  add constraint class_subjects_subject_id_school_id_fkey
    foreign key (subject_id, school_id)
    references public.subjects (id, school_id) on delete no action;

alter table public.student_enrollments
  drop constraint student_enrollments_class_id_school_id_fkey,
  add constraint student_enrollments_class_id_school_id_fkey
    foreign key (class_id, school_id)
    references public.classes (id, school_id) on delete no action;

alter table public.student_enrollments
  drop constraint student_enrollments_class_id_academic_year_id_fkey,
  add constraint student_enrollments_class_id_academic_year_id_fkey
    foreign key (class_id, academic_year_id)
    references public.classes (id, academic_year_id) on delete no action;

/**
 * Makes one academic year the school's current year (and clears the previous one) atomically.
 * Runs as the caller, so the structure.manage RLS policies decide whether it is allowed.
 */
create function public.set_current_academic_year(p_year_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_school_id uuid;
begin
  select school_id into v_school_id from public.academic_years where id = p_year_id;
  if v_school_id is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  -- Two statements: the partial unique index allows only one current year per school.
  update public.academic_years set is_current = false
  where school_id = v_school_id and is_current and id <> p_year_id;

  update public.academic_years set is_current = true where id = p_year_id;

  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.set_current_academic_year(uuid) from public, anon;
grant execute on function public.set_current_academic_year(uuid) to authenticated;
