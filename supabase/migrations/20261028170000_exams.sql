-- =====================================================================
-- P5 — Exams & grades.
--
-- Lifecycle (status changes only through public.exam_transition):
--   draft ──submit──▶ pending ──approve──▶ approved ──publish──▶ published
--                       └──reject (note)──▶ draft
--   * the subject's teacher (or exams.manage) builds the exam while it is a draft
--   * exams.approve holders approve / reject; approval tells the class's students
--   * results are recorded once approved; publishing shows them to students and parents
--     (and notifies both); after publishing only grades.edit holders may change a result
-- Online exams (feature `online_exams`):
--   * students never read exam_questions (they hold the answers): start_exam hands out the
--     paper once, without answers; submit_exam takes all answers in one write, auto-scores
--     MCQ / true-false and records the result. Short answers are reviewed by the teacher.
-- Everything is gated by the school's `exams` feature.
-- =====================================================================

create type public.exam_kind as enum ('monthly', 'midterm', 'final', 'quiz');
create type public.exam_mode as enum ('paper', 'online');
create type public.exam_status as enum ('draft', 'pending', 'approved', 'published');
create type public.question_type as enum ('mcq', 'true_false', 'short');

-- ---------------------------------------------------------------------
-- Exams
-- ---------------------------------------------------------------------
create table public.exams (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools (id) on delete cascade,
  class_id         uuid not null,
  class_subject_id uuid not null,
  title            text not null check (char_length(title) between 2 and 150),
  kind             public.exam_kind not null,
  mode             public.exam_mode not null default 'paper',
  starts_at        timestamptz not null,
  duration_minutes integer not null default 45 check (duration_minutes between 5 and 300),
  max_score        numeric(6, 2) not null check (max_score > 0),
  instructions     text not null default '' check (char_length(instructions) <= 2000),
  status           public.exam_status not null default 'draft',
  review_note      text check (char_length(review_note) <= 500),
  created_by       uuid default auth.uid(),
  reviewed_by      uuid,
  reviewed_at      timestamptz,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint exams_id_school_key unique (id, school_id),
  constraint exams_class_subject_fkey
    foreign key (class_subject_id, class_id, school_id)
    references public.class_subjects (id, class_id, school_id) on delete no action deferrable initially deferred,
  constraint exams_class_fkey
    foreign key (class_id, school_id)
    references public.classes (id, school_id) on delete no action deferrable initially deferred,
  foreign key (created_by, school_id) references public.profiles (id, school_id) on delete set null (created_by),
  foreign key (reviewed_by, school_id) references public.profiles (id, school_id) on delete set null (reviewed_by)
);

create index exams_school_idx on public.exams (school_id);
create index exams_class_starts_idx on public.exams (class_id, starts_at desc);
create index exams_class_subject_idx on public.exams (class_subject_id, class_id, school_id);
create index exams_class_school_idx on public.exams (class_id, school_id);
create index exams_pending_idx on public.exams (school_id) where status = 'pending';
create index exams_creator_idx on public.exams (created_by, school_id);
create index exams_reviewer_idx on public.exams (reviewed_by, school_id);

create trigger exams_set_updated_at
before update on public.exams
for each row execute function private.set_updated_at();

/** The exam's own teacher (or exams.manage), inside the caller's school. */
create function private.can_manage_exam(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exams e
    where e.id = p_exam_id
      and e.school_id = private.jwt_school_id()
      and (
        private.has_permission('exams.manage')
        or e.class_subject_id in (select private.teacher_class_subject_ids())
      )
  );
$$;

grant execute on function private.can_manage_exam(uuid) to authenticated;

alter table public.exams enable row level security;

create policy "exams: read" on public.exams for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('exams'))
  and (
    (select private.has_permission('exams.view'))
    or class_subject_id in (select private.teacher_class_subject_ids())
    or (
      status in ('approved', 'published')
      and (
        class_id in (select private.student_class_ids())
        or class_id in (select private.parent_class_ids())
      )
    )
  )
);

-- Plain writes only ever touch drafts; status changes go through exam_transition.
create policy "exams: insert draft" on public.exams for insert to authenticated
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('exams'))
  and status = 'draft'
  and (
    (select private.has_permission('exams.manage'))
    or class_subject_id in (select private.teacher_class_subject_ids())
  )
  and (mode = 'paper' or (select private.has_feature('online_exams')))
);

create policy "exams: update draft" on public.exams for update to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('exams'))
  and status = 'draft'
  and (
    (select private.has_permission('exams.manage'))
    or class_subject_id in (select private.teacher_class_subject_ids())
  )
)
with check (
  status = 'draft'
  and (
    (select private.has_permission('exams.manage'))
    or class_subject_id in (select private.teacher_class_subject_ids())
  )
  and (mode = 'paper' or (select private.has_feature('online_exams')))
);

create policy "exams: delete draft" on public.exams for delete to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('exams'))
  and status = 'draft'
  and (
    (select private.has_permission('exams.manage'))
    or class_subject_id in (select private.teacher_class_subject_ids())
  )
);

-- ---------------------------------------------------------------------
-- Question bank (per subject) and exam questions (a snapshot per exam)
-- ---------------------------------------------------------------------
create table public.question_bank (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  subject_id     uuid not null,
  type           public.question_type not null,
  text           text not null check (char_length(text) between 1 and 2000),
  options        jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  correct_answer jsonb,
  points         numeric(5, 2) not null default 1 check (points > 0),
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  constraint question_bank_subject_fkey
    foreign key (subject_id, school_id)
    references public.subjects (id, school_id) on delete no action deferrable initially deferred,
  foreign key (created_by, school_id) references public.profiles (id, school_id) on delete set null (created_by)
);

create index question_bank_school_subject_idx on public.question_bank (school_id, subject_id);
create index question_bank_subject_idx on public.question_bank (subject_id, school_id);
create index question_bank_creator_idx on public.question_bank (created_by, school_id);

create table public.exam_questions (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  exam_id        uuid not null,
  position       integer not null default 0,
  type           public.question_type not null,
  text           text not null check (char_length(text) between 1 and 2000),
  options        jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  correct_answer jsonb,
  points         numeric(5, 2) not null default 1 check (points > 0),
  created_at     timestamptz not null default now(),
  constraint exam_questions_exam_fkey
    foreign key (exam_id, school_id) references public.exams (id, school_id) on delete cascade
);

create index exam_questions_exam_idx on public.exam_questions (exam_id, position);
create index exam_questions_exam_school_idx on public.exam_questions (exam_id, school_id);
create index exam_questions_school_idx on public.exam_questions (school_id);

/** MCQ needs ≥2 options and a valid index; true/false a boolean; short answers are free text. */
create function private.check_question_shape()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type = 'mcq' then
    if jsonb_array_length(new.options) < 2
       or jsonb_typeof(new.correct_answer) is distinct from 'number'
       or (new.correct_answer)::int < 0
       or (new.correct_answer)::int >= jsonb_array_length(new.options) then
      raise exception 'invalid_question' using errcode = 'MD007';
    end if;
  elsif new.type = 'true_false' then
    if jsonb_typeof(new.correct_answer) is distinct from 'boolean' then
      raise exception 'invalid_question' using errcode = 'MD007';
    end if;
    new.options := '[]'::jsonb;
  else
    new.options := '[]'::jsonb;
  end if;
  return new;
end;
$$;

create trigger question_bank_check_shape
before insert or update on public.question_bank
for each row execute function private.check_question_shape();

create trigger exam_questions_check_shape
before insert or update on public.exam_questions
for each row execute function private.check_question_shape();

alter table public.question_bank enable row level security;
alter table public.exam_questions enable row level security;

create policy "question_bank: read" on public.question_bank for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('exams'))
  and (
    (select private.has_permission('exams.manage'))
    or created_by = (select auth.uid())
    or subject_id in (
      select cs.subject_id from public.class_subjects cs
      where cs.id in (select private.teacher_class_subject_ids())
    )
  )
);

create policy "question_bank: insert" on public.question_bank for insert to authenticated
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('exams'))
  and created_by = (select auth.uid())
  and (
    (select private.has_permission('exams.manage'))
    or subject_id in (
      select cs.subject_id from public.class_subjects cs
      where cs.id in (select private.teacher_class_subject_ids())
    )
  )
);

create policy "question_bank: update own" on public.question_bank for update to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (created_by = (select auth.uid()) or (select private.has_permission('exams.manage')))
)
with check (school_id = (select private.jwt_school_id()));

create policy "question_bank: delete own" on public.question_bank for delete to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (created_by = (select auth.uid()) or (select private.has_permission('exams.manage')))
);

-- Students never select exam questions: they hold the correct answers.
create policy "exam_questions: read by staff" on public.exam_questions for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (
    (select private.has_permission('exams.view'))
    or (select private.can_manage_exam(exam_id))
  )
);

create policy "exam_questions: insert in draft" on public.exam_questions for insert to authenticated
with check (
  school_id = (select private.jwt_school_id())
  and (select private.can_manage_exam(exam_id))
  and exists (select 1 from public.exams e where e.id = exam_id and e.status = 'draft')
);

create policy "exam_questions: update in draft" on public.exam_questions for update to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.can_manage_exam(exam_id))
  and exists (select 1 from public.exams e where e.id = exam_id and e.status = 'draft')
)
with check (school_id = (select private.jwt_school_id()));

create policy "exam_questions: delete in draft" on public.exam_questions for delete to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.can_manage_exam(exam_id))
  and exists (select 1 from public.exams e where e.id = exam_id and e.status = 'draft')
);

-- ---------------------------------------------------------------------
-- Attempts (online) and results (both modes)
-- ---------------------------------------------------------------------
create table public.exam_attempts (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  exam_id      uuid not null,
  student_id   uuid not null,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  answers      jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  auto_score   numeric(6, 2),
  constraint exam_attempts_exam_student_key unique (exam_id, student_id),
  constraint exam_attempts_exam_fkey
    foreign key (exam_id, school_id) references public.exams (id, school_id) on delete cascade,
  foreign key (student_id, school_id) references public.profiles (id, school_id) on delete cascade
);

create index exam_attempts_exam_school_idx on public.exam_attempts (exam_id, school_id);
create index exam_attempts_student_idx on public.exam_attempts (student_id, school_id);
create index exam_attempts_school_idx on public.exam_attempts (school_id);

alter table public.exam_attempts enable row level security;

-- No insert/update policies: only start_exam / submit_exam write attempts.
create policy "exam_attempts: read" on public.exam_attempts for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (
    student_id = (select auth.uid())
    or (select private.has_permission('exams.view'))
    or (select private.can_manage_exam(exam_id))
  )
);

create table public.exam_results (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  exam_id     uuid not null,
  student_id  uuid not null,
  score       numeric(6, 2) not null check (score >= 0),
  note        text check (char_length(note) <= 300),
  recorded_by uuid default auth.uid(),
  updated_at  timestamptz not null default now(),
  constraint exam_results_exam_student_key unique (exam_id, student_id),
  -- Results protect their exam from deletion (checked at commit).
  constraint exam_results_exam_fkey
    foreign key (exam_id, school_id)
    references public.exams (id, school_id) on delete no action deferrable initially deferred,
  foreign key (student_id, school_id) references public.profiles (id, school_id) on delete cascade,
  foreign key (recorded_by, school_id) references public.profiles (id, school_id) on delete set null (recorded_by)
);

create index exam_results_exam_school_idx on public.exam_results (exam_id, school_id);
create index exam_results_student_idx on public.exam_results (student_id, school_id);
create index exam_results_school_idx on public.exam_results (school_id);
create index exam_results_recorder_idx on public.exam_results (recorded_by, school_id);

/** Score within the exam's maximum, student in the exam's class, recorder stamped. */
create function private.check_exam_result()
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
  new.recorded_by := coalesce(auth.uid(), new.recorded_by);
  new.updated_at := now();
  return new;
end;
$$;

create trigger exam_results_check
before insert or update on public.exam_results
for each row execute function private.check_exam_result();

/** Who may write a result now: the exam's teacher until it is published, grades.edit always. */
create function private.can_record_result(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exams e
    where e.id = p_exam_id
      and e.school_id = private.jwt_school_id()
      and private.has_feature('exams')
      and (
        (e.status = 'approved' and (
          private.has_permission('grades.record')
          or e.class_subject_id in (select private.teacher_class_subject_ids())
        ))
        or (e.status in ('approved', 'published') and private.has_permission('grades.edit'))
      )
  );
$$;

grant execute on function private.can_record_result(uuid) to authenticated;

alter table public.exam_results enable row level security;

create policy "exam_results: read" on public.exam_results for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('exams'))
  and (
    (select private.has_permission('grades.view'))
    or (select private.can_manage_exam(exam_id))
    or (
      (student_id = (select auth.uid()) or student_id in (select private.parent_student_ids()))
      and exists (select 1 from public.exams e where e.id = exam_id and e.status = 'published')
    )
  )
);

create policy "exam_results: insert" on public.exam_results for insert to authenticated
with check (
  school_id = (select private.jwt_school_id())
  and (select private.can_record_result(exam_id))
);

create policy "exam_results: update" on public.exam_results for update to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.can_record_result(exam_id))
)
with check (school_id = (select private.jwt_school_id()));

create policy "exam_results: delete" on public.exam_results for delete to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.can_record_result(exam_id))
);

-- ---------------------------------------------------------------------
-- Lifecycle
-- ---------------------------------------------------------------------
/**
 * Moves an exam through its lifecycle. p_action: submit | approve | reject | publish.
 * Notifies the class on approval and students + parents (with each score) on publication.
 */
create function public.exam_transition(p_exam_id uuid, p_action text, p_note text default null)
returns public.exam_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exam public.exams%rowtype;
  v_subject text;
  v_next public.exam_status;
begin
  select * into v_exam from public.exams e
  where e.id = p_exam_id and e.school_id = private.jwt_school_id()
  for update;
  if not found or not private.has_feature('exams') then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  if p_action = 'submit' then
    if v_exam.status <> 'draft' or not private.can_manage_exam(p_exam_id) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if v_exam.mode = 'online' and not exists (
      select 1 from public.exam_questions q where q.exam_id = p_exam_id
    ) then
      raise exception 'no_questions' using errcode = 'MD008';
    end if;
    v_next := 'pending';
    update public.exams set status = v_next, review_note = null where id = p_exam_id;

  elsif p_action in ('approve', 'reject') then
    if v_exam.status <> 'pending' or not private.has_permission('exams.approve') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if p_action = 'reject' and coalesce(btrim(p_note), '') = '' then
      raise exception 'note_required' using errcode = 'MD009';
    end if;
    v_next := case when p_action = 'approve' then 'approved' else 'draft' end;
    update public.exams
    set status = v_next, review_note = nullif(btrim(p_note), ''),
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_exam_id;

    if v_next = 'approved' then
      select s.name into v_subject
      from public.class_subjects cs join public.subjects s on s.id = cs.subject_id
      where cs.id = v_exam.class_subject_id;
      insert into public.notifications (school_id, recipient_id, kind, data)
      select v_exam.school_id, se.student_id, 'exam',
             jsonb_build_object('exam_id', v_exam.id, 'title', v_exam.title, 'subject', v_subject,
                                'kind', v_exam.kind, 'mode', v_exam.mode, 'starts_at', v_exam.starts_at)
      from public.student_enrollments se
      where se.class_id = v_exam.class_id;
    end if;

  elsif p_action = 'publish' then
    if v_exam.status <> 'approved'
       or not (private.can_manage_exam(p_exam_id) or private.has_permission('exams.approve')) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    v_next := 'published';
    update public.exams set status = v_next, published_at = now() where id = p_exam_id;

    select s.name into v_subject
    from public.class_subjects cs join public.subjects s on s.id = cs.subject_id
    where cs.id = v_exam.class_subject_id;
    insert into public.notifications (school_id, recipient_id, kind, data)
    select v_exam.school_id, recipient.id, 'grade',
           jsonb_build_object('exam_id', v_exam.id, 'title', v_exam.title, 'subject', v_subject,
                              'kind', v_exam.kind, 'score', r.score, 'max_score', v_exam.max_score,
                              'student_id', r.student_id, 'student_name', p.full_name)
    from public.exam_results r
    join public.profiles p on p.id = r.student_id
    cross join lateral (
      select r.student_id as id
      union
      select ps.parent_id from public.parent_students ps where ps.student_id = r.student_id
    ) as recipient
    where r.exam_id = p_exam_id;

  else
    raise exception 'unknown action' using errcode = '22023';
  end if;

  return v_next;
end;
$$;

revoke execute on function public.exam_transition(uuid, text, text) from public, anon;
grant execute on function public.exam_transition(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Online exam room
-- ---------------------------------------------------------------------
/**
 * Hands the student their paper (once per call, no answers inside) and opens their attempt.
 * Allowed only for an approved online exam of the student's class, inside its time window,
 * and only until they submit.
 */
create function public.start_exam(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exam public.exams%rowtype;
  v_ends timestamptz;
  v_attempt public.exam_attempts%rowtype;
begin
  select * into v_exam from public.exams e
  where e.id = p_exam_id and e.school_id = private.jwt_school_id();
  if not found
     or v_exam.mode <> 'online'
     or v_exam.status <> 'approved'
     or not private.has_feature('exams')
     or not private.has_feature('online_exams')
     or v_exam.class_id not in (select private.student_class_ids()) then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  v_ends := v_exam.starts_at + make_interval(mins => v_exam.duration_minutes);
  if now() < v_exam.starts_at then
    raise exception 'exam_not_started' using errcode = 'MD010';
  end if;

  select * into v_attempt from public.exam_attempts a
  where a.exam_id = p_exam_id and a.student_id = auth.uid();
  if found and v_attempt.submitted_at is not null then
    raise exception 'already_submitted' using errcode = 'MD011';
  end if;
  if now() > v_ends then
    raise exception 'exam_closed' using errcode = 'MD012';
  end if;
  if not found then
    insert into public.exam_attempts (school_id, exam_id, student_id)
    values (v_exam.school_id, p_exam_id, auth.uid())
    returning * into v_attempt;
  end if;

  return jsonb_build_object(
    'exam', jsonb_build_object(
      'id', v_exam.id, 'title', v_exam.title, 'instructions', v_exam.instructions,
      'max_score', v_exam.max_score, 'ends_at', v_ends
    ),
    'started_at', v_attempt.started_at,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'type', q.type, 'text', q.text, 'options', q.options, 'points', q.points
      ) order by q.position, q.created_at)
      from public.exam_questions q where q.exam_id = p_exam_id
    ), '[]'::jsonb)
  );
end;
$$;

/**
 * Takes every answer in one write ({question_id: answer}), auto-scores MCQ / true-false and records
 * the result. A 2-minute grace period absorbs slow connections at the deadline.
 */
create function public.submit_exam(p_exam_id uuid, p_answers jsonb)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exam public.exams%rowtype;
  v_attempt public.exam_attempts%rowtype;
  v_score numeric;
begin
  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'invalid answers' using errcode = '22023';
  end if;

  select * into v_exam from public.exams e
  where e.id = p_exam_id and e.school_id = private.jwt_school_id();
  select * into v_attempt from public.exam_attempts a
  where a.exam_id = p_exam_id and a.student_id = auth.uid()
  for update;
  if v_exam.id is null or v_attempt.id is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if v_attempt.submitted_at is not null then
    raise exception 'already_submitted' using errcode = 'MD011';
  end if;
  if now() > v_exam.starts_at + make_interval(mins => v_exam.duration_minutes) + interval '2 minutes' then
    raise exception 'exam_closed' using errcode = 'MD012';
  end if;

  select coalesce(sum(q.points), 0) into v_score
  from public.exam_questions q
  where q.exam_id = p_exam_id
    and q.type in ('mcq', 'true_false')
    and p_answers -> q.id::text = q.correct_answer;
  v_score := least(v_score, v_exam.max_score);

  update public.exam_attempts
  set answers = p_answers, submitted_at = now(), auto_score = v_score
  where id = v_attempt.id;

  insert into public.exam_results (school_id, exam_id, student_id, score)
  values (v_exam.school_id, p_exam_id, auth.uid(), v_score)
  on conflict (exam_id, student_id) do update set score = excluded.score;

  return v_score;
end;
$$;

revoke execute on function public.start_exam(uuid) from public, anon;
revoke execute on function public.submit_exam(uuid, jsonb) from public, anon;
grant execute on function public.start_exam(uuid) to authenticated;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;
