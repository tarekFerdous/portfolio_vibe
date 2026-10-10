-- Retire the old blog-photos storage bucket now that post-photos (017) holds
-- every object and the posts/post_blocks image URLs point at it instead
-- (PRD #128 / issue #132).
--
-- IMPORTANT: only run this migration after scripts/migrate-post-photos-bucket.ts
-- has been executed against the live project AND its verification step
-- (object count + sample URL check) has passed.
--
-- Supabase blocks direct SQL deletes on storage.objects / storage.buckets
-- (storage.protect_delete), so this migration only drops the bucket's RLS
-- policies. Delete the bucket itself through the Storage API: Dashboard ->
-- Storage -> blog-photos -> "Empty bucket", then "Delete bucket".

drop policy if exists "Public read blog-photos objects" on storage.objects;
drop policy if exists "Auth write blog-photos objects" on storage.objects;
