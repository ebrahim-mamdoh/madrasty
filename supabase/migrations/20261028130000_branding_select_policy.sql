-- Storage deletes only see rows the caller can SELECT. Without this, a school replacing its logo
-- could upload the new file but never remove the old one, leaving orphans in the bucket.
-- Public URLs keep working for everyone (public bucket); this only governs API listing/removal.
create policy "school-branding: school reads own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'school-branding'
  and (storage.foldername(name))[1] = (select private.jwt_school_id())::text
  and (select private.has_permission('settings.branding'))
);
