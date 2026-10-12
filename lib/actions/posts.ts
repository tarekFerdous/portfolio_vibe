'use server';

import { createClient } from '@/lib/supabase/server';
import { deleteImage, uploadImage } from './images';
import { generateSlug } from '@/lib/utils/slug';
import type { Post, PostBlock, PostStatus } from '@/lib/supabase/types';

export async function fetchPosts(): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPostWithBlocks(id: string): Promise<{ post: Post; blocks: PostBlock[] } | null> {
  const supabase = await createClient();
  const { data: post, error: postError } = await supabase.from('posts').select('*').eq('id', id).single();
  // PGRST116 = "no rows returned", which means the post genuinely doesn't exist (not a query failure).
  if (postError && postError.code !== 'PGRST116') throw new Error(postError.message);
  if (!post) return null;
  const { data: blocks, error: blocksError } = await supabase
    .from('post_blocks')
    .select('*')
    .eq('post_id', id)
    .order('display_order', { ascending: true });
  if (blocksError) throw new Error(blocksError.message);
  return { post, blocks: blocks ?? [] };
}

type PostValues = {
  id?: string;
  title: string;
  publish_date: string | null;
  location: string | null;
  status: PostStatus;
  excerpt?: string | null;
  cover_image_url?: string | null;
  author?: string;
  blocks: Array<{ id?: string; block_type: 'text' | 'photo'; content: string | null; image_url: string | null; display_order: number }>;
};

// Production Next.js hides messages thrown from server actions, so writes return their failure instead.
export type SavePostResult = { ok: true; id: string } | { ok: false; error: string };
export type DeletePostResult = { ok: true } | { ok: false; error: string };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'unknown error';
}

export async function upsertPost(values: PostValues): Promise<SavePostResult> {
  try {
    return { ok: true, id: await savePost(values) };
  } catch (err) {
    return { ok: false, error: `Couldn't ${values.id ? 'save' : 'create'} the post: ${errorMessage(err)}` };
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const UNIQUE_VIOLATION = '23505';
const FALLBACK_SLUG = 'untitled-post';
const SLUG_TAKEN_MESSAGE = 'its URL slug is already used by another post. Try a different title.';

/**
 * First free slug for `title`: the base slug, else base-2, base-3, …
 * `excludeId` is the post being saved, so it never collides with its own slug.
 */
async function resolveUniqueSlug(supabase: SupabaseClient, title: string, excludeId?: string): Promise<string> {
  const base = generateSlug(title).replace(/^-+|-+$/g, '') || FALLBACK_SLUG;
  const { data, error } = await supabase
    .from('posts')
    .select('id, slug')
    .or(`slug.eq.${base},slug.like.${base}-%`);
  if (error) throw new Error(error.message);
  const taken = new Set((data ?? []).filter((p) => p.id !== excludeId).map((p) => p.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Runs a write that may set a slug, resolving the slug again and retrying once
 * if another save claimed it in between (the unique constraint is the final guard).
 */
async function withSlugRetry(write: () => Promise<{ code?: string; message: string } | null>): Promise<void> {
  let error = await write();
  if (error?.code === UNIQUE_VIOLATION) error = await write();
  if (error?.code === UNIQUE_VIOLATION) throw new Error(SLUG_TAKEN_MESSAGE);
  if (error) throw new Error(error.message);
}

async function savePost(values: PostValues): Promise<string> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const fields = {
    title: values.title,
    publish_date: values.publish_date,
    location: values.location,
    status: values.status,
    excerpt: values.excerpt,
    cover_image_url: values.cover_image_url,
    author: values.author,
  };

  let postId = values.id;
  if (postId) {
    const id = postId;
    const { data: existing, error: lookupError } = await supabase.from('posts').select('status').eq('id', id).single();
    if (lookupError) throw new Error(lookupError.message);
    // A draft's slug follows its title; once published it is frozen so shared links keep working.
    const slugFollowsTitle = existing.status === 'draft';
    await withSlugRetry(async () => {
      const slug = slugFollowsTitle ? { slug: await resolveUniqueSlug(supabase, values.title, id) } : {};
      const { error } = await supabase.from('posts').update({ ...fields, ...slug, updated_at: now }).eq('id', id);
      return error;
    });
  } else {
    await withSlugRetry(async () => {
      const slug = await resolveUniqueSlug(supabase, values.title);
      const { data, error } = await supabase.from('posts').insert({ ...fields, slug }).select('id').single();
      if (!error) postId = data.id;
      return error;
    });
  }

  // Replace all blocks
  const { error: deleteBlocksError } = await supabase.from('post_blocks').delete().eq('post_id', postId);
  if (deleteBlocksError) throw new Error(deleteBlocksError.message);
  if (values.blocks.length > 0) {
    const { error: insertBlocksError } = await supabase.from('post_blocks').insert(
      values.blocks.map((b, i) => ({
        post_id: postId,
        block_type: b.block_type,
        content: b.content,
        image_url: b.image_url,
        display_order: i,
      }))
    );
    if (insertBlocksError) throw new Error(insertBlocksError.message);
  }

  return postId!;
}

export async function deletePost(id: string): Promise<DeletePostResult> {
  try {
    await removePost(id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Couldn't delete the post: ${errorMessage(err)}` };
  }
}

async function removePost(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: blocks, error: fetchBlocksError } = await supabase.from('post_blocks').select('image_url').eq('post_id', id);
  if (fetchBlocksError) throw new Error(fetchBlocksError.message);
  if (blocks) {
    await Promise.all(
      blocks.filter((b) => b.image_url).map((b) => deleteImage('post-photos', b.image_url!))
    );
  }
  const { error: deletePostError } = await supabase.from('posts').delete().eq('id', id);
  if (deletePostError) throw new Error(deletePostError.message);
}

export async function fetchPublishedPosts(): Promise<Post[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('publish_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPublishedPostBySlug(slug: string): Promise<{ post: Post; blocks: PostBlock[] } | null> {
  const supabase = await createClient();
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  // PGRST116 = "no rows returned", which means the post genuinely doesn't exist (not a query failure).
  if (postError && postError.code !== 'PGRST116') throw new Error(postError.message);
  if (!post) return null;
  const { data: blocks, error: blocksError } = await supabase
    .from('post_blocks')
    .select('*')
    .eq('post_id', post.id)
    .order('display_order', { ascending: true });
  if (blocksError) throw new Error(blocksError.message);
  return { post, blocks: blocks ?? [] };
}

export async function uploadPostCover(file: File): Promise<string> {
  return uploadImage('post-photos', file);
}

export async function deletePostCover(url: string): Promise<void> {
  return deleteImage('post-photos', url);
}
