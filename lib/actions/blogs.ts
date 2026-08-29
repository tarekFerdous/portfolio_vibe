'use server';

import { createClient } from '@/lib/supabase/server';
import { deleteImage, uploadImage } from './images';
import { generateSlug } from '@/lib/utils/slug';
import type { Blog, BlogBlock, BlogStatus } from '@/lib/supabase/types';

export async function fetchBlogs(): Promise<Blog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchBlogWithBlocks(id: string): Promise<{ blog: Blog; blocks: BlogBlock[] } | null> {
  const supabase = await createClient();
  const { data: blog, error: blogError } = await supabase.from('blogs').select('*').eq('id', id).single();
  // PGRST116 = "no rows returned", which means the blog genuinely doesn't exist (not a query failure).
  if (blogError && blogError.code !== 'PGRST116') throw new Error(blogError.message);
  if (!blog) return null;
  const { data: blocks, error: blocksError } = await supabase
    .from('blog_blocks')
    .select('*')
    .eq('blog_id', id)
    .order('display_order', { ascending: true });
  if (blocksError) throw new Error(blocksError.message);
  return { blog, blocks: blocks ?? [] };
}

export async function upsertBlog(values: {
  id?: string;
  title: string;
  publish_date: string | null;
  location: string | null;
  status: BlogStatus;
  excerpt?: string | null;
  cover_image_url?: string | null;
  author?: string;
  blocks: Array<{ id?: string; block_type: 'text' | 'photo'; content: string | null; image_url: string | null; display_order: number }>;
}): Promise<string> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let blogId = values.id;
  if (blogId) {
    const { error } = await supabase.from('blogs').update({
      title: values.title,
      publish_date: values.publish_date,
      location: values.location,
      status: values.status,
      excerpt: values.excerpt,
      cover_image_url: values.cover_image_url,
      author: values.author,
      updated_at: now,
    }).eq('id', blogId);
    if (error) throw new Error(error.message);
  } else {
    const slug = generateSlug(values.title);
    const { data, error } = await supabase.from('blogs').insert({
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
    blogId = data.id;
  }

  // Replace all blocks
  const { error: deleteBlocksError } = await supabase.from('blog_blocks').delete().eq('blog_id', blogId);
  if (deleteBlocksError) throw new Error(deleteBlocksError.message);
  if (values.blocks.length > 0) {
    const { error: insertBlocksError } = await supabase.from('blog_blocks').insert(
      values.blocks.map((b, i) => ({
        blog_id: blogId,
        block_type: b.block_type,
        content: b.content,
        image_url: b.image_url,
        display_order: i,
      }))
    );
    if (insertBlocksError) throw new Error(insertBlocksError.message);
  }

  return blogId!;
}

export async function deleteBlog(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: blocks, error: fetchBlocksError } = await supabase.from('blog_blocks').select('image_url').eq('blog_id', id);
  if (fetchBlocksError) throw new Error(fetchBlocksError.message);
  if (blocks) {
    await Promise.all(
      blocks.filter((b) => b.image_url).map((b) => deleteImage('blog-photos', b.image_url!))
    );
  }
  const { error: deleteBlogError } = await supabase.from('blogs').delete().eq('id', id);
  if (deleteBlogError) throw new Error(deleteBlogError.message);
}

export async function fetchPublishedBlogs(): Promise<Blog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('status', 'published')
    .order('publish_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPublishedBlogBySlug(slug: string): Promise<{ blog: Blog; blocks: BlogBlock[] } | null> {
  const supabase = await createClient();
  const { data: blog, error: blogError } = await supabase
    .from('blogs')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  // PGRST116 = "no rows returned", which means the blog genuinely doesn't exist (not a query failure).
  if (blogError && blogError.code !== 'PGRST116') throw new Error(blogError.message);
  if (!blog) return null;
  const { data: blocks, error: blocksError } = await supabase
    .from('blog_blocks')
    .select('*')
    .eq('blog_id', blog.id)
    .order('display_order', { ascending: true });
  if (blocksError) throw new Error(blocksError.message);
  return { blog, blocks: blocks ?? [] };
}

export async function uploadBlogCover(file: File): Promise<string> {
  return uploadImage('blog-photos', file);
}

export async function deleteBlogCover(url: string): Promise<void> {
  return deleteImage('blog-photos', url);
}
