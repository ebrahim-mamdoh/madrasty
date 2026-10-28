-- =====================================================================
-- Defer the "still in use" checks to commit time.
--
-- NO ACTION alone was not enough: each internal cascade of a school delete
-- runs as its own statement, so e.g. subjects were checked before the
-- school's class_subjects had been cascaded away. Deferred checks run once,
-- at commit, after every cascade has finished:
--   * deleting one year/class/grade/subject that is in use → still rejected (23503)
--   * deleting a whole school                              → succeeds
-- =====================================================================

alter table public.classes
  alter constraint classes_academic_year_id_school_id_fkey deferrable initially deferred,
  alter constraint classes_grade_level_id_school_id_fkey deferrable initially deferred;

alter table public.class_subjects
  alter constraint class_subjects_subject_id_school_id_fkey deferrable initially deferred;

alter table public.student_enrollments
  alter constraint student_enrollments_class_id_school_id_fkey deferrable initially deferred,
  alter constraint student_enrollments_class_id_academic_year_id_fkey deferrable initially deferred;
