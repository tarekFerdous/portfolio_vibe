-- Retire the old blog-photos storage bucket now that post-photos (017) holds
-- every object and the posts/post_blocks image URLs point at it instead
-- (PRD #128 / issue #132).
--
-- IMPORTANT: only run this migration after scripts/migrate-post-photos-bucket.ts
-- has been executed against the live project AND its verification step
-- (object count + sample URL check) has passed. Running this first would
-- delete images that cover_image_url/image_url still reference.

drop policy if exists "Public read blog-photos objects" on storage.objects;
drop policy if exists "Auth write blog-photos objects" on storage.objects;

delete from storage.objects where bucket_id = 'blog-photos';
delete from storage.buckets where id = 'blog-photos';
