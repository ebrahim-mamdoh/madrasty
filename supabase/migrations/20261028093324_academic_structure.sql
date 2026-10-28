-- =====================================================================
-- Academic structure: years, grade levels, classes, subjects,
-- teacher assignments, enrollments, parent ↔ student links.
-- =====================================================================

create table public.academic_years (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 40),
  starts_on  date not null,
  ends_on    date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  constraint academic_years_dates_check check (ends_on > starts_on),
  constraint academic_years_school_name_key unique (school_id, name),
  constraint academic_years_id_school_key unique (id, school_id)
);

-- At most one current year per school.
create unique index academic_years_one_current_idx
  on public.academic_years (school_id) where is_current;

create table public.grade_levels (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint grade_levels_school_name_key unique (school_id, name),
  constraint grade_levels_id_school_key unique (id, school_id)
);

create index grade_levels_school_order_idx on public.grade_levels (school_id, sort_order);

create table public.subjects (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  code       text check (char_length(code) <= 20),
  created_at timestamptz not null default now(),
  constraint subjects_school_name_key unique (school_id, name),
  constraint subjects_id_school_key unique (id, school_id)
);

create table public.classes (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools (id) on delete cascade,
  academic_year_id    uuid not null,
  grade_level_id      uuid not null,
  name                text not null check (char_length(name) between 1 and 60),
  homeroom_teacher_id uuid,
  created_at          timestamptz not null default now(),
  constraint classes_year_grade_name_key unique (academic_year_id, grade_level_id, name),
  constraint classes_id_school_key unique (id, school_id),
  constraint classes_id_year_key unique (id, academic_year_id),
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id) on delete cascade,
  foreign key (grade_level_id, school_id) references public.grade_levels (id, school_id) on delete restrict,
  foreign key (homeroom_teacher_id, school_id) references public.profiles (id, school_id) on delete set null (homeroom_teacher_id)
);

create index classes_school_year_idx on public.classes (school_id, academic_year_id);
create index classes_grade_level_idx on public.classes (grade_level_id);
create index classes_homeroom_teacher_idx on public.classes (homeroom_teacher_id) where homeroom_teacher_id is not null;

/** Which teacher teaches which subject in which class. */
create table public.class_subjects (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null,
  class_id   uuid not null,
  subject_id uuid not null,
  teacher_id uuid,
  created_at timestamptz not null default now(),
  constraint class_subjects_class_subject_key unique (class_id, subject_id),
  constraint class_subjects_id_school_key unique (id, school_id),
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  foreign key (subject_id, school_id) references public.subjects (id, school_id) on delete restrict,
  foreign key (teacher_id, school_id) references public.profiles (id, school_id) on delete set null (teacher_id)
);

create index class_subjects_school_idx on public.class_subjects (school_id);
create index class_subjects_subject_idx on public.class_subjects (subject_id);
create index class_subjects_teacher_idx on public.class_subjects (teacher_id) where teacher_id is not null;

create table public.student_enrollments (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null,
  student_id       uuid not null,
  class_id         uuid not null,
  academic_year_id uuid not null,
  enrolled_at      timestamptz not null default now(),
  -- One class per student per academic year.
  constraint student_enrollments_student_year_key unique (student_id, academic_year_id),
  foreign key (student_id, school_id) references public.profiles (id, school_id) on delete cascade,
  foreign key (class_id, school_id) references public.classes (id, school_id) on delete cascade,
  foreign key (class_id, academic_year_id) references public.classes (id, academic_year_id) on delete cascade
);

create index student_enrollments_class_idx on public.student_enrollments (class_id);
create index student_enrollments_school_year_idx on public.student_enrollments (school_id, academic_year_id);

create table public.parent_students (
  school_id  uuid not null,
  parent_id  uuid not null,
  student_id uuid not null,
  relation   text check (relation in ('father', 'mother', 'guardian')),
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id),
  foreign key (parent_id, school_id) references public.profiles (id, school_id) on delete cascade,
  foreign key (student_id, school_id) references public.profiles (id, school_id) on delete cascade
);

create index parent_students_student_idx on public.parent_students (student_id);
create index parent_students_school_idx on public.parent_students (school_id);

-- ---------------------------------------------------------------------
-- Role integrity: an FK guarantees the same school; these triggers
-- guarantee the referenced profile has the right role (otherwise e.g.
-- assigning a student as "teacher" would grant them teacher access).
-- ---------------------------------------------------------------------
create function private.assert_profile_role(p_profile_id uuid, p_role public.app_role)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_profile_id is not null and not exists (
    select 1 from public.profiles where id = p_profile_id and role = p_role
  ) then
    raise exception 'Profile % must have role %', p_profile_id, p_role using errcode = '23514';
  end if;
end;
$$;

create function private.check_class_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.assert_profile_role(new.homeroom_teacher_id, 'teacher');
  return new;
end;
$$;

create trigger classes_check_roles
before insert or update of homeroom_teacher_id on public.classes
for each row execute function private.check_class_roles();

create function private.check_class_subject_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.assert_profile_role(new.teacher_id, 'teacher');
  return new;
end;
$$;

create trigger class_subjects_check_roles
before insert or update of teacher_id on public.class_subjects
for each row execute function private.check_class_subject_roles();

create function private.check_enrollment_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.assert_profile_role(new.student_id, 'student');
  return new;
end;
$$;

create trigger student_enrollments_check_roles
before insert or update of student_id on public.student_enrollments
for each row execute function private.check_enrollment_roles();

create function private.check_parent_student_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.assert_profile_role(new.parent_id, 'parent');
  perform private.assert_profile_role(new.student_id, 'student');
  return new;
end;
$$;

create trigger parent_students_check_roles
before insert or update on public.parent_students
for each row execute function private.check_parent_student_roles();

-- ---------------------------------------------------------------------
-- Scope helpers — set-returning so policies can use `x in (select …)`
-- and Postgres evaluates them once per statement.
-- ---------------------------------------------------------------------
create function private.teacher_class_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cs.class_id from public.class_subjects cs where cs.teacher_id = auth.uid()
  union
  select c.id from public.classes c where c.homeroom_teacher_id = auth.uid();
$$;

create function private.student_class_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select se.class_id from public.student_enrollments se where se.student_id = auth.uid();
$$;

create function private.parent_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ps.student_id from public.parent_students ps where ps.parent_id = auth.uid();
$$;

/** Students enrolled in any class the calling teacher teaches. */
create function private.teacher_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select se.student_id
  from public.student_enrollments se
  where se.class_id in (select private.teacher_class_ids());
$$;

grant execute on function
  private.teacher_class_ids(),
  private.student_class_ids(),
  private.parent_student_ids(),
  private.teacher_student_ids()
to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.academic_years enable row level security;
alter table public.grade_levels enable row level security;
alter table public.subjects enable row level security;
alter table public.classes enable row level security;
alter table public.class_subjects enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.parent_students enable row level security;

-- School structure is readable by everyone in the school; changes need structure.manage.
do $$
declare
  t text;
begin
  foreach t in array array['academic_years', 'grade_levels', 'subjects', 'classes', 'class_subjects']
  loop
    execute format(
      'create policy "%1$s: school members read" on public.%1$I for select to authenticated
         using (school_id = (select private.jwt_school_id()))',
      t
    );
    execute format(
      'create policy "%1$s: managed with structure.manage" on public.%1$I for all to authenticated
         using (school_id = (select private.jwt_school_id()) and (select private.has_permission(''structure.manage'')))
         with check (school_id = (select private.jwt_school_id()) and (select private.has_permission(''structure.manage'')))',
      t
    );
  end loop;
end;
$$;

-- enrollments
create policy "student_enrollments: staff with students.view read"
on public.student_enrollments for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('students.view'))
);

create policy "student_enrollments: teachers read their classes"
on public.student_enrollments for select to authenticated
using (class_id in (select private.teacher_class_ids()));

create policy "student_enrollments: students read own"
on public.student_enrollments for select to authenticated
using (student_id = (select auth.uid()));

create policy "student_enrollments: parents read children"
on public.student_enrollments for select to authenticated
using (student_id in (select private.parent_student_ids()));

create policy "student_enrollments: managed with students.manage"
on public.student_enrollments for all to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('students.manage'))
)
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('students.manage'))
);

-- parent links
create policy "parent_students: staff with parents.view read"
on public.parent_students for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('parents.view'))
);

create policy "parent_students: parents read own links"
on public.parent_students for select to authenticated
using (parent_id = (select auth.uid()));

create policy "parent_students: managed with parents.manage"
on public.parent_students for all to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('parents.manage'))
)
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_permission('parents.manage'))
);

-- profiles: teachers see their students, parents see their children.
create policy "profiles: teachers read their students"
on public.profiles for select to authenticated
using (id in (select private.teacher_student_ids()));

create policy "profiles: parents read their children"
on public.profiles for select to authenticated
using (id in (select private.parent_student_ids()));
