-- The enrollment check must see every enrollment, not only those the caller may read; otherwise a
-- teacher writing to a class that isn't theirs got "student_not_in_class" instead of the RLS refusal.
-- It only reads, and RLS (WITH CHECK, evaluated after BEFORE triggers) still decides who may write.
alter function private.check_attendance_record() security definer;
