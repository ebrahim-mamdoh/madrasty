-- SVG can embed scripts (stored XSS when opened directly). Logos are raster-only.
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'school-branding';
