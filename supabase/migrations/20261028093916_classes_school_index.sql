-- Covers classes.school_id → schools (cascade deletes, school-scoped listing).
create index classes_school_idx on public.classes (school_id);
