'use server';

import { createClient } from '@/lib/supabase/server';
import type { Comment, CommentWithPost } from '@/lib/supabase/types';

export async function fetchCommentsForPost(postId: string): Promise<Comment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllCommentsForModeration(): Promise<CommentWithPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*, posts(title, slug)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function postComment({
  postId,
  content,
  parentCommentId,
}: {
  postId: string;
  content: string;
  parentCommentId?: string | null;
}): Promise<Comment> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user || !user.email) throw new Error('You must be signed in to comment.');

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      parent_comment_id: parentCommentId ?? null,
      author_id: user.id,
      author_email: user.email,
      content,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateComment({
  commentId,
  content,
}: {
  commentId: string;
  content: string;
}): Promise<Comment> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function softDeleteComment(commentId: string): Promise<Comment> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function moderateRemoveComment(commentId: string): Promise<Comment> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString(), removed_by_moderator: true })
    .eq('id', commentId)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}
