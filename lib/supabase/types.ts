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

export type BlogStatus = 'draft' | 'published';

export type Blog = {
  id: string;
  title: string;
  slug: string;
  publish_date: string | null;
  location: string | null;
  status: BlogStatus;
  excerpt: string | null;
  cover_image_url: string | null;
  author: string;
  created_at: string;
  updated_at: string;
};

export type BlockType = 'text' | 'photo';

export type BlogBlock = {
  id: string;
  blog_id: string;
  block_type: BlockType;
  content: string | null;
  image_url: string | null;
  display_order: number;
};

export type Comment = {
  id: string;
  blog_id: string;
  parent_comment_id: string | null;
  author_id: string;
  author_email: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
