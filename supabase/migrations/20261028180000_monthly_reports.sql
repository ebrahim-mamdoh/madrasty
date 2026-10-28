-- =====================================================================
-- P6 — Monthly reports: an academic + behavioural report per student per month.
--
--   * the class's teachers (or reports.send holders) write drafts
--   * send_monthly_reports sends a batch "with one click": status → sent, parents and the
--     student are notified, and the report is locked
--   * students and parents only ever see sent reports
--   * gated by the school's `monthly_reports` feature
-- =====================================================================

create type public.report_status as enum ('draft', 'sent');

create table public.monthly_reports (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  student_id     uuid not null,
  class_id       uuid not null,
  month          date not null check (extract(day from month) = 1),
  ratings        jsonb not null default '{}'::jsonb check (jsonb_typeof(ratings) = 'object'),
  academic_note  text not null default '' check (char_length(academic_note) <= 2000),
  behavior_note  text not null default '' check (char_length(behavior_note) <= 2000),
  status         public.report_status not null default 'draft',
  author_id      uuid default auth.uid(),
  sent_by        uuid,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint monthly_reports_student_month_key unique (student_id, month),
  foreign key (student_id, school_id) references public.profiles (id, school_id) on delete cascade,
  constraint monthly_reports_class_fkey
    foreign key (class_id, school_id)
    references public.classes (id, school_id) on delete no action deferrable initially deferred,
  foreign key (author_id, school_id) references public.profiles (id, school_id) on delete set null (author_id),
  foreign key (sent_by, school_id) references public.profiles (id, school_id) on delete set null (sent_by)
);

create index monthly_reports_class_month_idx on public.monthly_reports (class_id, month);
create index monthly_reports_class_school_idx on public.monthly_reports (class_id, school_id);
create index monthly_reports_student_idx on public.monthly_reports (student_id, school_id);
create index monthly_reports_school_month_idx on public.monthly_reports (school_id, month);
create index monthly_reports_author_idx on public.monthly_reports (author_id, school_id);
create index monthly_reports_sender_idx on public.monthly_reports (sent_by, school_id);

/** Student in the class, ratings are 1–5 for known criteria, author stamped, status kept out of plain writes. */
create function private.check_monthly_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
begin
  if not exists (
    select 1 from public.student_enrollments se
    where se.student_id = new.student_id and se.class_id = new.class_id
  ) then
    raise exception 'student_not_in_class' using errcode = 'MD003';
  end if;

  for v_key, v_value in select * from jsonb_each(new.ratings) loop
    if v_key not in ('participation', 'behavior', 'homework', 'discipline')
       or jsonb_typeof(v_value) <> 'number'
       or (v_value)::numeric not in (1, 2, 3, 4, 5) then
      raise exception 'invalid_rating' using errcode = 'MD013';
    end if;
  end loop;

  if tg_op = 'INSERT' then
    new.status := 'draft';
    new.sent_at := null;
    new.sent_by := null;
  end if;
  -- The author is whoever last wrote the draft; sending doesn't change it.
  if new.status = 'draft' then
    new.author_id := coalesce(auth.uid(), new.author_id);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger monthly_reports_check
before insert or update on public.monthly_reports
for each row execute function private.check_monthly_report();

alter table public.monthly_reports enable row level security;

create policy "monthly_reports: read" on public.monthly_reports for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('monthly_reports'))
  and (
    (select private.has_permission('reports.view'))
    or class_id in (select private.teacher_class_ids())
    or (
      status = 'sent'
      and (student_id = (select auth.uid()) or student_id in (select private.parent_student_ids()))
    )
  )
);

-- Drafts only: sending (and the locked state that follows) goes through send_monthly_reports.
create policy "monthly_reports: insert draft" on public.monthly_reports for insert to authenticated
with check (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('monthly_reports'))
  and status = 'draft'
  and (
    class_id in (select private.teacher_class_ids())
    or (select private.has_permission('reports.send'))
  )
);

create policy "monthly_reports: update draft" on public.monthly_reports for update to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (select private.has_feature('monthly_reports'))
  and status = 'draft'
  and (
    class_id in (select private.teacher_class_ids())
    or (select private.has_permission('reports.send'))
  )
)
with check (
  status = 'draft'
  and (
    class_id in (select private.teacher_class_ids())
    or (select private.has_permission('reports.send'))
  )
);

create policy "monthly_reports: delete draft" on public.monthly_reports for delete to authenticated
using (
  school_id = (select private.jwt_school_id())
  and status = 'draft'
  and (
    class_id in (select private.teacher_class_ids())
    or (select private.has_permission('reports.send'))
  )
);

/**
 * Sends draft reports to parents in one go. Only the caller's own drafts they may send
 * (class teachers for their classes, reports.send for any); returns how many were sent.
 */
create function public.send_monthly_reports(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.has_feature('monthly_reports') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with sent as (
    update public.monthly_reports r
    set status = 'sent', sent_at = now(), sent_by = auth.uid()
    where r.id = any (p_ids)
      and r.school_id = private.jwt_school_id()
      and r.status = 'draft'
      and (
        private.has_permission('reports.send')
        or r.class_id in (select private.teacher_class_ids())
      )
    returning r.id, r.school_id, r.student_id, r.month
  ),
  recipients as (
    select s.id, s.school_id, s.student_id, s.month, s.student_id as recipient_id from sent s
    union all
    select s.id, s.school_id, s.student_id, s.month, ps.parent_id
    from sent s join public.parent_students ps on ps.student_id = s.student_id
  ),
  notified as (
    insert into public.notifications (school_id, recipient_id, kind, data)
    select r.school_id, r.recipient_id, 'monthly_report',
           jsonb_build_object('report_id', r.id, 'student_id', r.student_id,
                              'student_name', p.full_name, 'month', r.month)
    from recipients r join public.profiles p on p.id = r.student_id
    returning 1
  )
  select count(*)::integer into v_count from sent;

  return v_count;
end;
$$;

revoke execute on function public.send_monthly_reports(uuid[]) from public, anon;
grant execute on function public.send_monthly_reports(uuid[]) to authenticated;
