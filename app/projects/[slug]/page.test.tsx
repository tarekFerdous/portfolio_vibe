import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectPage, { generateMetadata } from './page';
import { fetchStoredReadme } from '@/lib/actions/projectReadmes';
import { fetchVisibleProjectBySlug } from '@/lib/actions/projects';
import type { Project, ProjectReadmeRow } from '@/lib/supabase/types';

vi.mock('@/lib/actions/projects', () => ({ fetchVisibleProjectBySlug: vi.fn() }));
vi.mock('@/lib/actions/projectReadmes', () => ({ fetchStoredReadme: vi.fn() }));

const notFoundError = new Error('NEXT_NOT_FOUND');
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
}));

const fetchMock = vi.fn();

const project: Project = {
  id: 'p1',
  name: 'Rhubarb',
  slug: 'rhubarb',
  repo_url: 'https://github.com/o/rhubarb',
  summary: 'A planning CLI',
  project_description: 'First line\nSecond line',
  image_url: null,
  bg_color: '#123456',
  skills: ['TypeScript', 'Node'],
  display_order: 0,
  visibility: 'visible',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const readme: ProjectReadmeRow = {
  project_id: 'p1',
  markdown: '# Rhubarb README\n\nHello from GitHub.',
  owner: 'o',
  repo: 'rhubarb',
  branch: 'main',
  is_private: false,
  html_url: 'https://github.com/o/rhubarb',
  readme_path: 'README.md',
  fetched_at: '2026-10-01T00:00:00.000Z',
  last_attempt_at: '2026-10-01T00:00:00.000Z',
  last_error: null,
};

const params = (slug = 'rhubarb') => ({ params: Promise.resolve({ slug }) });

async function renderPage(slug?: string) {
  render(await ProjectPage(params(slug)));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchVisibleProjectBySlug).mockResolvedValue(project);
  vi.mocked(fetchStoredReadme).mockResolvedValue(readme);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProjectPage', () => {
  it('renders the hero: name, skill chips, back link', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Rhubarb' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Skills' })).toHaveTextContent('TypeScriptNode');
    expect(screen.getByRole('link', { name: /back to projects/i })).toHaveAttribute('href', '/#projects');
    expect(screen.getByTestId('project-hero-cover')).toHaveStyle({ backgroundColor: '#123456' });
  });

  it('shows the stored README instead of the description', async () => {
    await renderPage();
    expect(fetchStoredReadme).toHaveBeenCalledWith('p1');
    expect(screen.getByRole('heading', { name: 'Rhubarb README' })).toBeInTheDocument();
    expect(screen.queryByTestId('project-description')).toBeNull();
  });

  it('never calls GitHub', async () => {
    await renderPage();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to project_description when no README is stored', async () => {
    vi.mocked(fetchStoredReadme).mockResolvedValue(null);
    await renderPage();
    expect(screen.getByTestId('project-description')).toHaveTextContent('First line Second line');
    expect(screen.getByTestId('project-description').className).toContain('whitespace-pre-line');
  });

  it('falls back to project_description when reading the stored README fails', async () => {
    vi.mocked(fetchStoredReadme).mockRejectedValue(new Error('relation does not exist'));
    await renderPage();
    expect(screen.getByTestId('project-description')).toBeInTheDocument();
  });

  it('falls back to project_description when the repo has no README', async () => {
    vi.mocked(fetchStoredReadme).mockResolvedValue({ ...readme, markdown: null });
    await renderPage();
    expect(screen.getByTestId('project-description')).toBeInTheDocument();
  });

  it('renders the hero only when there is no README and no description', async () => {
    vi.mocked(fetchVisibleProjectBySlug).mockResolvedValue({ ...project, repo_url: null, project_description: '  ' });
    await renderPage();
    expect(fetchStoredReadme).not.toHaveBeenCalled();
    expect(screen.queryByTestId('project-description')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Rhubarb' })).toBeInTheDocument();
  });

  it('shows "View on GitHub" for a public repo', async () => {
    await renderPage();
    expect(screen.getByRole('link', { name: /view on github/i })).toHaveAttribute('href', 'https://github.com/o/rhubarb');
  });

  it('hides "View on GitHub" for a private repo', async () => {
    vi.mocked(fetchStoredReadme).mockResolvedValue({ ...readme, is_private: true });
    await renderPage();
    expect(screen.queryByRole('link', { name: /view on github/i })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Rhubarb README' })).toBeInTheDocument();
  });

  it('hides "View on GitHub" when only a failed fetch has been stored', async () => {
    vi.mocked(fetchStoredReadme).mockResolvedValue({
      ...readme,
      markdown: null,
      owner: null,
      repo: null,
      branch: null,
      is_private: null,
      html_url: null,
      readme_path: null,
      fetched_at: null,
      last_error: 'no_access',
    });
    await renderPage();
    expect(screen.queryByRole('link', { name: /view on github/i })).toBeNull();
    expect(screen.getByTestId('project-description')).toBeInTheDocument();
  });

  it('hides "View on GitHub" when there is no repo URL', async () => {
    vi.mocked(fetchVisibleProjectBySlug).mockResolvedValue({ ...project, repo_url: null });
    await renderPage();
    expect(screen.queryByRole('link', { name: /view on github/i })).toBeNull();
  });

  it('404s for a hidden or missing project', async () => {
    vi.mocked(fetchVisibleProjectBySlug).mockResolvedValue(null);
    await expect(ProjectPage(params('nope'))).rejects.toBe(notFoundError);
  });

  it('builds metadata from the project name and summary', async () => {
    expect(await generateMetadata(params())).toEqual({ title: 'Rhubarb', description: 'A planning CLI' });
  });
});
