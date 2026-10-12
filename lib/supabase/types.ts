export type Intro = {
  id: string;
  title: string;
  summary: string;
  updated_at: string;
};

export type IntroCover = {
  id: string;
  storage_path: string;
  url: string;
  created_at: string;
};

export type ProjectVisibility = 'visible' | 'hidden';

export type Project = {
  id: string;
  name: string;
  slug: string;
  repo_url: string | null;
  summary: string;
  project_description: string;
  image_url: string | null;
  bg_color: string | null;
  skills: string[];
  display_order: number;
  visibility: ProjectVisibility;
  created_at: string;
  updated_at: string;
};

export type ReadmeErrorReason = 'no_access' | 'rate_limited' | 'network';

/** `manual` pages render the admin-pasted `manual_markdown`; GitHub refreshes never touch it. */
export type ReadmeSource = 'github' | 'manual';

export type ProjectReadmeRow = {
  project_id: string;
  source: ReadmeSource;
  /** Null when the repo has no README (or no fetch has succeeded yet). GitHub source only. */
  markdown: string | null;
  owner: string | null;
  repo: string | null;
  branch: string | null;
  is_private: boolean | null;
  html_url: string | null;
  readme_path: string | null;
  fetched_at: string | null;
  last_attempt_at: string | null;
  last_error: ReadmeErrorReason | null;
  /** Sanitized README pasted by the admin; null when empty. */
  manual_markdown: string | null;
  manual_updated_at: string | null;
};

/** What the admin Projects manager needs to show a row's README status and edit its manual README. */
export type ReadmeStatus = {
  source: ReadmeSource;
  fetched_at: string | null;
  last_error: ReadmeErrorReason | null;
  has_markdown: boolean;
  manual_markdown: string | null;
  manual_updated_at: string | null;
};

export type PostStatus = 'draft' | 'published';

export type Post = {
  id: string;
  title: string;
  slug: string;
  publish_date: string | null;
  location: string | null;
  status: PostStatus;
  excerpt: string | null;
  cover_image_url: string | null;
  author: string;
  created_at: string;
  updated_at: string;
};

export type BlockType = 'text' | 'photo';

export type PostBlock = {
  id: string;
  post_id: string;
  block_type: BlockType;
  content: string | null;
  image_url: string | null;
  display_order: number;
};

export type Comment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;
  author_email: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  removed_by_moderator: boolean;
};

export type CommentWithPost = Comment & {
  posts: { title: string; slug: string } | null;
};

export type CommentVote = {
  id: string;
  comment_id: string;
  voter_id: string;
  value: number;
  created_at: string;
};

export type Contacts = {
  id: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  location: string | null;
  hire_me_destination: string | null;
  updated_at: string;
};
