'use server';

import { createClient } from '@/lib/supabase/server';
import type { CommentVote } from '@/lib/supabase/types';

export async function castVote({
  commentId,
  value,
}: {
  commentId: string;
  value: 1 | -1;
}): Promise<CommentVote> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('You must be signed in to vote.');

  const { data, error } = await supabase
    .from('comment_votes')
    .upsert(
      { comment_id: commentId, voter_id: user.id, value },
      { onConflict: 'comment_id,voter_id' }
    )
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function retractVote(commentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('You must be signed in to vote.');

  const { error } = await supabase
    .from('comment_votes')
    .delete()
    .eq('comment_id', commentId)
    .eq('voter_id', user.id);
  if (error) throw new Error(error.message);
}

export async function fetchVotesForBlog(commentIds: string[]): Promise<CommentVote[]> {
  if (commentIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.from('comment_votes').select('*').in('comment_id', commentIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}
