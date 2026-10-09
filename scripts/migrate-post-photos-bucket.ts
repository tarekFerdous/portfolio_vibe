// One-off migration: copies every object from the old `blog-photos` storage
// bucket into the new `post-photos` bucket (created by migration 017), then
// rewrites the `cover_image_url` / `image_url` columns on `posts` and
// `post_blocks` that still point at `blog-photos` so they point at
// `post-photos` instead (PRD #128 / issue #132).
//
// This is a one-time operation the site owner runs against the live project —
// it is NOT run in CI and needs the service-role key, which bypasses the
// owner-scoped RLS policies on posts/post_blocks. Run it with:
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:post-photos
//
// After it prints a successful verification, apply migration 018 to drop the
// old blog-photos bucket. Do not apply 018 before this script has verified —
// doing so would delete images that the database still references.

import { createClient } from '@supabase/supabase-js';

const SOURCE_BUCKET = 'blog-photos';
const DEST_BUCKET = 'post-photos';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listAllObjects(bucket: string): Promise<string[]> {
  const names: string[] = [];
  const pageSize = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list('', {
      limit: pageSize,
      offset,
    });
    if (error) throw new Error(`Failed to list ${bucket}: ${error.message}`);
    if (!data || data.length === 0) break;

    names.push(...data.map((entry) => entry.name));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return names;
}

async function copyObject(path: string): Promise<void> {
  const { data: downloaded, error: downloadError } = await supabase.storage
    .from(SOURCE_BUCKET)
    .download(path);
  if (downloadError) throw new Error(`Failed to download ${path}: ${downloadError.message}`);

  const { error: uploadError } = await supabase.storage
    .from(DEST_BUCKET)
    .upload(path, downloaded, { upsert: true });
  if (uploadError) throw new Error(`Failed to upload ${path} to ${DEST_BUCKET}: ${uploadError.message}`);
}

async function rewriteUrls(table: 'posts' | 'post_blocks', column: 'cover_image_url' | 'image_url'): Promise<number> {
  const { data: rows, error: selectError } = await supabase
    .from(table)
    .select(`id, ${column}`)
    .like(column, `%/${SOURCE_BUCKET}/%`);
  if (selectError) throw new Error(`Failed to read ${table}.${column}: ${selectError.message}`);

  let updated = 0;
  for (const row of (rows ?? []) as Array<{ id: string } & Record<string, string | null>>) {
    const oldUrl = row[column];
    if (!oldUrl) continue;
    const newUrl = oldUrl.replace(`/${SOURCE_BUCKET}/`, `/${DEST_BUCKET}/`);
    const { error: updateError } = await supabase.from(table).update({ [column]: newUrl }).eq('id', row.id);
    if (updateError) throw new Error(`Failed to update ${table}.${column} for ${row.id}: ${updateError.message}`);
    updated += 1;
  }
  return updated;
}

async function main() {
  console.log(`Listing objects in ${SOURCE_BUCKET}...`);
  const objectPaths = await listAllObjects(SOURCE_BUCKET);
  console.log(`Found ${objectPaths.length} object(s) to copy.`);

  for (const path of objectPaths) {
    await copyObject(path);
    console.log(`Copied ${path}`);
  }

  console.log('Rewriting posts.cover_image_url...');
  const coverUpdates = await rewriteUrls('posts', 'cover_image_url');
  console.log(`Updated ${coverUpdates} cover image URL(s).`);

  console.log('Rewriting post_blocks.image_url...');
  const blockUpdates = await rewriteUrls('post_blocks', 'image_url');
  console.log(`Updated ${blockUpdates} content-block image URL(s).`);

  console.log(`Verifying object counts between ${SOURCE_BUCKET} and ${DEST_BUCKET}...`);
  const destPaths = await listAllObjects(DEST_BUCKET);
  if (destPaths.length < objectPaths.length) {
    throw new Error(
      `Verification failed: ${DEST_BUCKET} has ${destPaths.length} object(s), expected at least ${objectPaths.length}.`
    );
  }
  const missing = objectPaths.filter((path) => !destPaths.includes(path));
  if (missing.length > 0) {
    throw new Error(`Verification failed: missing object(s) in ${DEST_BUCKET}: ${missing.join(', ')}`);
  }

  const sample = objectPaths.slice(0, 5);
  for (const path of sample) {
    const { data } = supabase.storage.from(DEST_BUCKET).getPublicUrl(path);
    console.log(`Sample URL: ${data.publicUrl}`);
  }

  console.log('Migration complete and verified.');
  console.log(`Next step: apply migration 018_drop_blog_photos_bucket.sql to retire ${SOURCE_BUCKET}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
