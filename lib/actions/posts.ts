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

export async function upsertPost(values: {
  id?: string;
  title: string;
  publish_date: string | null;
  location: string | null;
  status: PostStatus;
  excerpt?: string | null;
  cover_image_url?: string | null;
  author?: string;
  blocks: Array<{ id?: string; block_type: 'text' | 'photo'; content: string | null; image_url: string | null; display_order: number }>;
}): Promise<string> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let postId = values.id;
  if (postId) {
    const { error } = await supabase.from('posts').update({
      title: values.title,
      publish_date: values.publish_date,
      location: values.location,
      status: values.status,
      excerpt: values.excerpt,
      cover_image_url: values.cover_image_url,
      author: values.author,
      updated_at: now,
    }).eq('id', postId);
    if (error) throw new Error(error.message);
  } else {
    const slug = generateSlug(values.title);
    const { data, error } = await supabase.from('posts').insert({
      title: values.title,
      slug,
      publish_date: values.publish_date,
      location: values.location,
      status: values.status,
      excerpt: values.excerpt,
      cover_image_url: values.cover_image_url,
      author: values.author,
    }).select('id').single();
    if (error) throw new Error(error.message);
    postId = data.id;
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

export async function deletePost(id: string): Promise<void> {
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
