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
  source: 'github',
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
  manual_markdown: null,
  manual_updated_at: null,
};

const manualReadme: ProjectReadmeRow = {
  ...readme,
  source: 'manual',
  manual_markdown: '# Sanitized overview\n\nA general description.\n\n![Arch](docs/arch.png) See [setup](docs/setup.md).',
  manual_updated_at: '2026-10-11T00:00:00.000Z',
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
    vi.mocked(fetchStoredReadme).mockResolvedValue(null);
    await renderPage();
    expect(screen.queryByTestId('project-description')).toBeNull();
    expect(screen.queryByRole('article')).toBeNull();
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

  it('ignores a leftover GitHub README once repo_url is gone', async () => {
    vi.mocked(fetchVisibleProjectBySlug).mockResolvedValue({ ...project, repo_url: null });
    await renderPage();
    expect(screen.queryByRole('heading', { name: 'Rhubarb README' })).toBeNull();
    expect(screen.getByTestId('project-description')).toBeInTheDocument();
  });

  describe('manual README', () => {
    beforeEach(() => {
      vi.mocked(fetchStoredReadme).mockResolvedValue(manualReadme);
    });

    it('renders the manual README instead of the GitHub copy', async () => {
      await renderPage();
      expect(screen.getByRole('heading', { name: 'Sanitized overview' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Rhubarb README' })).toBeNull();
      expect(screen.queryByTestId('project-description')).toBeNull();
    });

    it('never shows "View on GitHub", even when the stored repo is public', async () => {
      await renderPage();
      expect(screen.queryByRole('link', { name: /view on github/i })).toBeNull();
    });

    it('strips relative images and links so nothing points into the repo', async () => {
      await renderPage();
      const article = screen.getByRole('heading', { name: 'Sanitized overview' }).closest('article')!;
      expect(article.querySelector('img')).toBeNull();
      expect(article.querySelector('a')).toBeNull();
      expect(article).toHaveTextContent('Arch See setup.');
      expect(article.innerHTML).not.toContain('github.com');
    });

    it('renders for a project without a repo_url', async () => {
      vi.mocked(fetchVisibleProjectBySlug).mockResolvedValue({ ...project, repo_url: null });
      await renderPage();
      expect(fetchStoredReadme).toHaveBeenCalledWith('p1');
      expect(screen.getByRole('heading', { name: 'Sanitized overview' })).toBeInTheDocument();
    });

    it('falls back to the description (not the GitHub copy) when the manual README is empty', async () => {
      vi.mocked(fetchStoredReadme).mockResolvedValue({ ...manualReadme, manual_markdown: '   ' });
      await renderPage();
      expect(screen.queryByRole('heading', { name: 'Rhubarb README' })).toBeNull();
      expect(screen.getByTestId('project-description')).toBeInTheDocument();
    });

    it('falls back to the hero when the manual README and description are both empty', async () => {
      vi.mocked(fetchVisibleProjectBySlug).mockResolvedValue({ ...project, project_description: '' });
      vi.mocked(fetchStoredReadme).mockResolvedValue({ ...manualReadme, manual_markdown: null });
      await renderPage();
      expect(screen.queryByTestId('project-description')).toBeNull();
      expect(screen.getByRole('heading', { level: 1, name: 'Rhubarb' })).toBeInTheDocument();
    });
  });

  it('404s for a hidden or missing project', async () => {
    vi.mocked(fetchVisibleProjectBySlug).mockResolvedValue(null);
    await expect(ProjectPage(params('nope'))).rejects.toBe(notFoundError);
  });

  it('builds metadata from the project name and summary', async () => {
    expect(await generateMetadata(params())).toEqual({ title: 'Rhubarb', description: 'A planning CLI' });
  });
});
