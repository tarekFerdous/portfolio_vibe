-- Sweep the comments table's post-identifier naming from blog_id to post_id,
-- consistent with the posts/post_blocks rename in migration 015 (PRD #128 / issue #131).

alter table comments rename column blog_id to post_id;
alter index comments_blog_id_idx rename to comments_post_id_idx;
