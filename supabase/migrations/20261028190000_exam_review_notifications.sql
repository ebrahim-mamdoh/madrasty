-- P7 — The exam's author hears back from the review: approved, or sent back with the reason.
-- (Students are notified of approved exams by exam_transition itself.)
create function private.notify_exam_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null or old.status <> 'pending' then
    return null;
  end if;
  if new.status in ('approved', 'draft') then
    insert into public.notifications (school_id, recipient_id, kind, data)
    values (
      new.school_id, new.created_by, 'exam',
      jsonb_strip_nulls(jsonb_build_object(
        'event', case when new.status = 'approved' then 'approved' else 'rejected' end,
        'exam_id', new.id,
        'title', new.title,
        'note', new.review_note
      ))
    );
  end if;
  return null;
end;
$$;

create trigger exams_notify_review
after update of status on public.exams
for each row execute function private.notify_exam_review();
