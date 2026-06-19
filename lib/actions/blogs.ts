'use server';

import { createClient } from '@/lib/supabase/server';
import { deleteImage } from './images';
import { generateSlug } from '@/lib/utils/slug';
import type { Blog, BlogBlock, BlogStatus } from '@/lib/supabase/types';

export async function fetchBlogs(): Promise<Blog[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
  return data ?? [];
}

export async function fetchBlogWithBlocks(id: string): Promise<{ blog: Blog; blocks: BlogBlock[] } | null> {
  const supabase = await createClient();
  const { data: blog } = await supabase.from('blogs').select('*').eq('id', id).single();
  if (!blog) return null;
  const { data: blocks } = await supabase
    .from('blog_blocks')
    .select('*')
    .eq('blog_id', id)
    .order('display_order', { ascending: true });
  return { blog, blocks: blocks ?? [] };
}

export async function upsertBlog(values: {
  id?: string;
  title: string;
  publish_date: string | null;
  location: string | null;
  status: BlogStatus;
  blocks: Array<{ id?: string; block_type: 'text' | 'photo'; content: string | null; image_url: string | null; display_order: number }>;
}): Promise<string> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  let blogId = values.id;
  if (blogId) {
    await supabase.from('blogs').update({
      title: values.title,
      publish_date: values.publish_date,
      location: values.location,
      status: values.status,
      updated_at: now,
    }).eq('id', blogId);
  } else {
    const slug = generateSlug(values.title);
    const { data, error } = await supabase.from('blogs').insert({
      title: values.title,
      slug,
      publish_date: values.publish_date,
      location: values.location,
      status: values.status,
    }).select('id').single();
    if (error) throw new Error(error.message);
    blogId = data.id;
  }

  // Replace all blocks
  await supabase.from('blog_blocks').delete().eq('blog_id', blogId);
  if (values.blocks.length > 0) {
    await supabase.from('blog_blocks').insert(
      values.blocks.map((b, i) => ({
        blog_id: blogId,
        block_type: b.block_type,
        content: b.content,
        image_url: b.image_url,
        display_order: i,
      }))
    );
  }

  return blogId!;
}

export async function deleteBlog(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: blocks } = await supabase.from('blog_blocks').select('image_url').eq('blog_id', id);
  if (blocks) {
    await Promise.all(
      blocks.filter((b) => b.image_url).map((b) => deleteImage('blog-photos', b.image_url!))
    );
  }
  await supabase.from('blogs').delete().eq('id', id);
}
