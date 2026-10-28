-- =====================================================================
-- Storage buckets. Objects are namespaced by school: `{school_id}/...`.
-- =====================================================================

-- Logos must render on public pages (login, emails), so this bucket is public-read.
-- Writes are still restricted to the owning school.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-branding',
  'school-branding',
  true,
  2 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "school-branding: school writes own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'school-branding'
  and (storage.foldername(name))[1] = (select private.jwt_school_id())::text
  and (select private.has_permission('settings.branding'))
);

create policy "school-branding: school updates own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'school-branding'
  and (storage.foldername(name))[1] = (select private.jwt_school_id())::text
  and (select private.has_permission('settings.branding'))
);

create policy "school-branding: school deletes own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'school-branding'
  and (storage.foldername(name))[1] = (select private.jwt_school_id())::text
  and (select private.has_permission('settings.branding'))
);

create policy "school-branding: platform owner manages"
on storage.objects for all to authenticated
using (bucket_id = 'school-branding' and (select private.is_super_admin()))
with check (bucket_id = 'school-branding' and (select private.is_super_admin()));
