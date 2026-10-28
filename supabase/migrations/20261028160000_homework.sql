-- =====================================================================
-- P4 — Homework: assignments per class subject, student submissions, grading, attachments.
--
--   * the subject's teacher (or homework.manage) assigns, edits and grades
--   * students of the class submit (text + files) until graded; late = after due_at
--   * a guard trigger keeps each side to its own columns (students never touch grades,
--     graders never touch answers)
--   * everything is gated by the school's `homework` feature
--   * notifications: new homework → class students; graded → the student;
--     past due and not submitted → parents (pg_cron, every 30 min)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create function private.teacher_class_subject_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cs.id from public.class_subjects cs where cs.teacher_id = auth.uid();
$$;

create function private.parent_class_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select se.class_id
  from public.student_enrollments se
  join public.parent_students ps on ps.student_id = se.student_id
  where ps.parent_id = auth.uid();
$$;

grant execute on function private.teacher_class_subject_ids() to authenticated;
grant execute on function private.parent_class_ids() to authenticated;

-- ---------------------------------------------------------------------
-- Homework
-- ---------------------------------------------------------------------
create table public.homework (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools (id) on delete cascade,
  class_id            uuid not null,
  class_subject_id    uuid not null,
  title               text not null check (char_length(title) between 2 and 150),
  body                text not null default '' check (char_length(body) <= 5000),
  due_at              timestamptz not null,
  max_score           numeric(5, 2) check (max_score > 0),
  attachments         jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  created_by          uuid default auth.uid(),
  missing_notified_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint homework_id_school_key unique (id, school_id),
  -- Homework protects its subject and class from deletion (checked at commit, see 121000).
  constraint homework_class_subject_fkey
    foreign key (class_subject_id, class_id, school_id)
    references public.class_subjects (id, class_id, school_id) on delete no action deferrable initially deferred,
  constraint homework_class_fkey
    foreign key (class_id, school_id)
    references public.classes (id, school_id) on delete no action deferrable initially deferred,
  foreign key (created_by, school_id)
    references public.profiles (id, school_id) on delete set null (created_by)
);

create index homework_school_idx on public.homework (school_id);
create index homework_class_due_idx on public.homework (class_id, due_at desc);
create index homework_class_subject_idx on public.homework (class_subject_id, class_id, school_id);
create index homework_class_school_idx on public.homework (class_id, school_id);
create index homework_creator_idx on public.homework (created_by, school_id);
create index homework_pending_missing_idx on public.homework (due_at) where missing_notified_at is null;

create trigger homework_set_updated_at
before update on public.homework
for each row execute function private.set_updated_at();

alter table public.homework enable row level security;

create policy "homework: read" on public.homework for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('homework'))
  and (
    (select private.has_permission('homework.view'))
    or class_id in (select private.teacher_class_ids())
    or class_id in (select private.student_class_ids())
    or class_id in (select private.parent_class_ids())
  )
);

create policy "homework: insert" on public.homework for insert to authenticated
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('homework'))
  and (
    (select private.has_permission('homework.manage'))
    or class_subject_id in (select private.teacher_class_subject_ids())
  )
);

create policy "homework: update" on public.homework for update to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('homework'))
  and (
    (select private.has_permission('homework.manage'))
    or class_subject_id in (select private.teacher_class_subject_ids())
  )
)
with check (
  school_id = (select private.jwt_school_id())
  and (
    (select private.has_permission('homework.manage'))
    or class_subject_id in (select private.teacher_class_subject_ids())
  )
);

create policy "homework: delete" on public.homework for delete to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('homework'))
  and (
    (select private.has_permission('homework.manage'))
    or class_subject_id in (select private.teacher_class_subject_ids())
  )
);

-- ---------------------------------------------------------------------
-- Submissions
-- ---------------------------------------------------------------------
create table public.homework_submissions (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  homework_id  uuid not null,
  student_id   uuid not null,
  body         text not null default '' check (char_length(body) <= 5000),
  attachments  jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  submitted_at timestamptz not null default now(),
  score        numeric(5, 2) check (score >= 0),
  feedback     text check (char_length(feedback) <= 1000),
  graded_by    uuid,
  graded_at    timestamptz,
  constraint homework_submissions_homework_student_key unique (homework_id, student_id),
  -- A homework with submissions cannot be deleted (checked at commit).
  constraint homework_submissions_homework_fkey
    foreign key (homework_id, school_id)
    references public.homework (id, school_id) on delete no action deferrable initially deferred,
  foreign key (student_id, school_id) references public.profiles (id, school_id) on delete cascade,
  foreign key (graded_by, school_id)
    references public.profiles (id, school_id) on delete set null (graded_by)
);

create index homework_submissions_school_idx on public.homework_submissions (school_id);
create index homework_submissions_homework_school_idx on public.homework_submissions (homework_id, school_id);
create index homework_submissions_student_idx on public.homework_submissions (student_id, school_id);
create index homework_submissions_grader_idx on public.homework_submissions (graded_by, school_id);

/** May the caller grade (and see every submission of) this homework? */
create function private.can_grade_homework(p_homework_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.homework h
    where h.id = p_homework_id
      and h.school_id = private.jwt_school_id()
      and (
        private.has_permission('homework.manage')
        or h.class_subject_id in (select private.teacher_class_subject_ids())
      )
  );
$$;

grant execute on function private.can_grade_homework(uuid) to authenticated;

/**
 * Keeps each side to its own columns and validates what it writes:
 *   student  → body/attachments only, only while ungraded, only for their class's homework
 *   grader   → score/feedback only, score within the homework's max
 */
create function private.guard_homework_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max numeric;
  v_class uuid;
begin
  select h.max_score, h.class_id into v_max, v_class from public.homework h where h.id = new.homework_id;

  if auth.uid() is not null and new.student_id = auth.uid() then
    if tg_op = 'INSERT' then
      if not exists (
        select 1 from public.student_enrollments se
        where se.student_id = new.student_id and se.class_id = v_class
      ) then
        raise exception 'student_not_in_class' using errcode = 'MD003';
      end if;
      new.score := null;
      new.feedback := null;
      new.graded_by := null;
      new.graded_at := null;
    else
      if old.graded_at is not null then
        raise exception 'already_graded' using errcode = 'MD005';
      end if;
      new.score := old.score;
      new.feedback := old.feedback;
      new.graded_by := old.graded_by;
      new.graded_at := old.graded_at;
      new.homework_id := old.homework_id;
    end if;
    new.submitted_at := now();
  elsif tg_op = 'UPDATE' then
    -- A grader: the answer stays exactly as the student left it.
    new.body := old.body;
    new.attachments := old.attachments;
    new.submitted_at := old.submitted_at;
    new.student_id := old.student_id;
    new.homework_id := old.homework_id;
    if new.score is not null and v_max is not null and new.score > v_max then
      raise exception 'score_above_max' using errcode = 'MD006';
    end if;
    if new.score is distinct from old.score or new.feedback is distinct from old.feedback then
      new.graded_by := coalesce(auth.uid(), new.graded_by);
      new.graded_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger homework_submissions_guard
before insert or update on public.homework_submissions
for each row execute function private.guard_homework_submission();

alter table public.homework_submissions enable row level security;

create policy "homework_submissions: read" on public.homework_submissions for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('homework'))
  and (
    student_id = (select auth.uid())
    or student_id in (select private.parent_student_ids())
    or (select private.has_permission('homework.view'))
    or (select private.can_grade_homework(homework_id))
  )
);

create policy "homework_submissions: student submits" on public.homework_submissions for insert to authenticated
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('homework'))
  and student_id = (select auth.uid())
);

create policy "homework_submissions: update" on public.homework_submissions for update to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('homework'))
  and (
    (student_id = (select auth.uid()) and graded_at is null)
    or (select private.can_grade_homework(homework_id))
  )
)
with check (
  school_id = (select private.jwt_school_id())
  and (
    student_id = (select auth.uid())
    or (select private.can_grade_homework(homework_id))
  )
);

-- ---------------------------------------------------------------------
-- Overview for teachers and managers (runs under RLS).
-- ---------------------------------------------------------------------
create function public.homework_overview(p_class_id uuid default null)
returns table (
  homework_id uuid,
  students integer,
  submitted integer,
  graded integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    h.id,
    (select count(*)::integer from public.student_enrollments se where se.class_id = h.class_id),
    (select count(*)::integer from public.homework_submissions s where s.homework_id = h.id),
    (select count(*)::integer from public.homework_submissions s
      where s.homework_id = h.id and s.graded_at is not null)
  from public.homework h
  where p_class_id is null or h.class_id = p_class_id;
$$;

revoke execute on function public.homework_overview(uuid) from public, anon;
grant execute on function public.homework_overview(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create function private.notify_homework_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text;
begin
  select s.name into v_subject
  from public.class_subjects cs join public.subjects s on s.id = cs.subject_id
  where cs.id = new.class_subject_id;

  insert into public.notifications (school_id, recipient_id, kind, data)
  select new.school_id, se.student_id, 'homework',
         jsonb_build_object('event', 'assigned', 'homework_id', new.id, 'title', new.title,
                            'subject', v_subject, 'due_at', new.due_at)
  from public.student_enrollments se
  where se.class_id = new.class_id;
  return null;
end;
$$;

create trigger homework_notify_assigned
after insert on public.homework
for each row execute function private.notify_homework_assigned();

create function private.notify_homework_graded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  if new.graded_at is not null and old.graded_at is distinct from new.graded_at then
    select h.title into v_title from public.homework h where h.id = new.homework_id;
    insert into public.notifications (school_id, recipient_id, kind, data)
    values (new.school_id, new.student_id, 'homework',
            jsonb_build_object('event', 'graded', 'homework_id', new.homework_id, 'title', v_title,
                               'score', new.score));
  end if;
  return null;
end;
$$;

create trigger homework_submissions_notify_graded
after update of score, feedback on public.homework_submissions
for each row execute function private.notify_homework_graded();

/** Past-due homework: tell the parents of every student who didn't submit (once per homework). */
create function private.notify_missing_homework()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  with due as (
    update public.homework h
    set missing_notified_at = now()
    where h.missing_notified_at is null
      and h.due_at < now()
      and h.due_at > now() - interval '7 days'
      and exists (
        select 1 from public.school_features sf
        where sf.school_id = h.school_id and sf.feature_key = 'homework'
      )
    returning h.id
  )
  select array_agg(id) into v_ids from due;

  if v_ids is null then
    return;
  end if;

  insert into public.notifications (school_id, recipient_id, kind, data)
  select h.school_id, ps.parent_id, 'homework_missing',
         jsonb_build_object('homework_id', h.id, 'title', h.title,
                            'student_id', se.student_id, 'student_name', p.full_name, 'due_at', h.due_at)
  from public.homework h
  join public.student_enrollments se on se.class_id = h.class_id
  join public.profiles p on p.id = se.student_id
  join public.parent_students ps on ps.student_id = se.student_id
  where h.id = any (v_ids)
    and not exists (
      select 1 from public.homework_submissions s
      where s.homework_id = h.id and s.student_id = se.student_id
    );
end;
$$;

revoke execute on function private.notify_missing_homework() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule(
  'notify-missing-homework',
  '*/30 * * * *',
  $$ select private.notify_missing_homework(); $$
);

-- ---------------------------------------------------------------------
-- Storage: private bucket. Paths:
--   {school}/homework/{homework_id}/{file}                 — teacher attachments
--   {school}/submissions/{homework_id}/{student_id}/{file} — student uploads
-- Readers are exactly those who can read the homework / submission row.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework', 'homework', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'application/zip'
  ]
);

/** Can the caller read the object at `p_name` in the homework bucket? */
create function private.can_read_homework_object(p_name text)
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
  if v_parts[1] is distinct from private.jwt_school_id()::text then
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

/** Can the caller upload to `p_name`? Teachers to their homework's folder, students to their own. */
create function private.can_write_homework_object(p_name text)
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
    -- The homework row is created after its files are uploaded, so check the folder's owner by role.
    return private.has_permission('homework.manage')
      or exists (select 1 from public.class_subjects cs where cs.teacher_id = auth.uid())
      or private.can_grade_homework(v_homework);
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

grant execute on function private.can_read_homework_object(text) to authenticated;
grant execute on function private.can_write_homework_object(text) to authenticated;

create policy "homework bucket: read" on storage.objects for select to authenticated
using (bucket_id = 'homework' and private.can_read_homework_object(name));

create policy "homework bucket: upload" on storage.objects for insert to authenticated
with check (bucket_id = 'homework' and private.can_write_homework_object(name));

create policy "homework bucket: uploader deletes" on storage.objects for delete to authenticated
using (bucket_id = 'homework' and owner_id = (select auth.uid())::text);
