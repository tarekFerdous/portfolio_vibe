import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProjectForm, ProjectsManagerClient } from './ProjectsManagerClient';
import { refreshAllProjectReadmes, type ReadmeRefreshSummaryEntry } from '@/lib/actions/projectReadmes';
import { setProjectVisibility, deleteProject, reorderProjects, upsertProject } from '@/lib/actions/projects';
import { colorForId, pickRandomColor, projectColorPalette } from '@/lib/colors';
import type { DropResult } from '@hello-pangea/dnd';
import type { Project, ReadmeStatus } from '@/lib/supabase/types';

vi.mock('@/lib/actions/projects', () => ({
  uploadProjectCover: vi.fn().mockResolvedValue('https://example.com/cover.jpg'),
  deleteProjectCover: vi.fn().mockResolvedValue(undefined),
  upsertProject: vi.fn().mockResolvedValue({ readme: null }),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  reorderProjects: vi.fn().mockResolvedValue(undefined),
  setProjectVisibility: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/actions/projectReadmes', () => ({
  refreshAllProjectReadmes: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/colors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/colors')>();
  return {
    ...actual,
    // Keep the real palette-picking behavior by default so tests that don't
    // care about randomization (e.g. the "+ New project" flow) still get a
    // real, non-null palette color. Individual tests can override this with
    // mockReturnValueOnce for a deterministic, distinguishable value.
    pickRandomColor: vi.fn(actual.pickRandomColor),
  };
});

let capturedOnDragEnd: ((result: DropResult) => void) | null = null;

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (result: DropResult) => void }) => {
    capturedOnDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  Droppable: ({ children }: { children: (provided: unknown) => React.ReactNode }) =>
    children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }),
  Draggable: ({ children }: { children: (provided: unknown, snapshot: unknown) => React.ReactNode }) =>
    children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));

type EditingProject = Omit<Project, 'created_at' | 'updated_at'>;

function makeProject(overrides: Partial<EditingProject> = {}): EditingProject {
  return {
    id: 'project-1',
    name: 'Test Project',
    slug: 'test-project',
    repo_url: null,
    summary: 'A short summary',
    project_description: '',
    image_url: null,
    skills: [],
    display_order: 0,
    visibility: 'visible',
    ...overrides,
  };
}

function setup(project: EditingProject) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  render(<ProjectForm project={project} onSave={onSave} onCancel={onCancel} />);
  return { onSave, onCancel };
}

beforeEach(() => {
  capturedOnDragEnd = null;
  window.confirm = vi.fn(() => true);
});

describe('ProjectForm - Description field', () => {
  it('renders with an existing project_description value shown in the textarea', () => {
    const project = makeProject({ project_description: 'Existing multi-paragraph description.' });
    setup(project);
    const textarea = screen.getByDisplayValue('Existing multi-paragraph description.');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('typing in the description textarea and clicking Save calls onSave with the updated project_description', async () => {
    const project = makeProject({ project_description: '' });
    const { onSave } = setup(project);

    const label = screen.getByText('Description');
    const textarea = label.parentElement!.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'A brand new description.' } });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ project_description: 'A brand new description.' })
    ));
  });

  it('a blank/default project renders the field empty and can be saved without error', async () => {
    const project = makeProject({ project_description: '' });
    const { onSave } = setup(project);

    const label = screen.getByText('Description');
    const textarea = label.parentElement!.querySelector('textarea')! as HTMLTextAreaElement;
    expect(textarea.value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ project_description: '' })
    ));
  });
});

function makeFullProject(overrides: Partial<Project> = {}): Project {
  return {
    ...makeProject(overrides),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProjectsManagerClient - visibility toggle', () => {
  it('renders a toggle switch per project row', () => {
    const projects = [makeFullProject({ id: 'a' }), makeFullProject({ id: 'b' })];
    render(<ProjectsManagerClient initialProjects={projects} />);
    expect(screen.getAllByRole('button', { name: /toggle visibility/i })).toHaveLength(2);
  });

  it('applies dimmed styling to a hidden project row', () => {
    const projects = [makeFullProject({ id: 'a', name: 'Hidden One', visibility: 'hidden' })];
    render(<ProjectsManagerClient initialProjects={projects} />);
    const row = screen.getByText('Hidden One').closest('div.rounded-\\[20px\\]');
    expect(row).toHaveClass('opacity-50');
  });

  it('does not dim a visible project row', () => {
    const projects = [makeFullProject({ id: 'a', name: 'Visible One', visibility: 'visible' })];
    render(<ProjectsManagerClient initialProjects={projects} />);
    const row = screen.getByText('Visible One').closest('div.rounded-\\[20px\\]');
    expect(row).not.toHaveClass('opacity-50');
  });

  it('clicking the toggle calls setProjectVisibility with the flipped value', async () => {
    const projects = [makeFullProject({ id: 'a', visibility: 'visible' })];
    render(<ProjectsManagerClient initialProjects={projects} />);
    fireEvent.click(screen.getByRole('button', { name: /toggle visibility/i }));
    await waitFor(() => expect(setProjectVisibility).toHaveBeenCalledWith('a', 'hidden'));
  });

  it('reverts the toggle and shows an inline error when the update fails', async () => {
    (setProjectVisibility as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Toggle failed'));
    const projects = [makeFullProject({ id: 'a', visibility: 'visible' })];
    render(<ProjectsManagerClient initialProjects={projects} />);

    fireEvent.click(screen.getByRole('button', { name: /toggle visibility/i }));

    await waitFor(() => expect(screen.getByText('Toggle failed')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /toggle visibility: currently visible/i })).toBeInTheDocument();
  });
});

describe('ProjectForm - save error handling', () => {
  it('shows an inline error and does not show "Saved!" when the save fails', async () => {
    const project = makeProject();
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const onCancel = vi.fn();
    render(<ProjectForm project={project} onSave={onSave} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument());
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });
});

describe('ProjectsManagerClient - delete error handling', () => {
  it('restores the row and shows an inline error when delete fails', async () => {
    (deleteProject as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Delete failed'));
    const projects = [makeFullProject({ id: 'a', name: 'Keep Me' })];
    render(<ProjectsManagerClient initialProjects={projects} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.getByText('Delete failed')).toBeInTheDocument());
    expect(screen.getByText('Keep Me')).toBeInTheDocument();
  });
});

describe('ProjectsManagerClient - bg_color backfill', () => {
  beforeEach(() => {
    (upsertProject as ReturnType<typeof vi.fn>).mockClear();
  });

  it('backfills a deterministic color via colorForId and persists it for a project with a null bg_color', async () => {
    const projects = [makeFullProject({ id: 'a', name: 'No Color', bg_color: null })];
    render(<ProjectsManagerClient initialProjects={projects} />);

    await waitFor(() =>
      expect(upsertProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'a', bg_color: colorForId('a') })
      )
    );
  });

  it('does not call upsertProject for a project that already has a bg_color', async () => {
    const projects = [makeFullProject({ id: 'b', name: 'Has Color', bg_color: '#8b5cf6' })];
    render(<ProjectsManagerClient initialProjects={projects} />);

    await act(async () => {});

    expect(upsertProject).not.toHaveBeenCalled();
  });
});

describe('ProjectsManagerClient - new project bg_color', () => {
  beforeEach(() => {
    (upsertProject as ReturnType<typeof vi.fn>).mockClear();
  });

  it('assigns a non-null bg_color to a newly created project before any save', async () => {
    render(<ProjectsManagerClient initialProjects={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /\+ new project/i }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(upsertProject).toHaveBeenCalledTimes(1));
    const savedProject = (upsertProject as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedProject.bg_color).not.toBeNull();
    expect(projectColorPalette).toContain(savedProject.bg_color);
  });
});

describe('ProjectForm - Randomize color', () => {
  it('clicking Randomize updates the in-form bg_color, and Save persists the new value', async () => {
    (pickRandomColor as ReturnType<typeof vi.fn>).mockReturnValueOnce('#00ff00');
    const project = makeProject({ bg_color: '#8b5cf6' });
    const { onSave } = setup(project);

    fireEvent.click(screen.getByRole('button', { name: /randomize/i }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ bg_color: '#00ff00' })
    ));
    const savedProject = onSave.mock.calls[0][0];
    expect(savedProject.bg_color).not.toBe('#8b5cf6');
  });
});

describe('ProjectForm - Summary length validation', () => {
  it('saves successfully when the summary is exactly at the 300 character limit', async () => {
    const summary = 'a'.repeat(300);
    const project = makeProject({ summary: '' });
    const { onSave } = setup(project);

    const label = screen.getByText('Summary');
    const textarea = label.parentElement!.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: summary } });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ summary })
    ));
  });

  it('rejects a summary over the 300 character limit without calling onSave', async () => {
    const summary = 'a'.repeat(301);
    const project = makeProject({ summary: '' });
    const { onSave } = setup(project);

    const label = screen.getByText('Summary');
    const textarea = label.parentElement!.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: summary } });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByText(/Summary must be 300 characters or fewer/i)).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('ProjectsManagerClient - reorder error handling', () => {
  it('reverts the list order and shows an inline error when reorder fails', async () => {
    (reorderProjects as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Reorder failed'));
    const projects = [makeFullProject({ id: 'a', name: 'First' }), makeFullProject({ id: 'b', name: 'Second' })];
    render(<ProjectsManagerClient initialProjects={projects} />);

    await act(async () => {
      capturedOnDragEnd?.({
        draggableId: 'a',
        type: 'DEFAULT',
        source: { droppableId: 'projects', index: 0 },
        destination: { droppableId: 'projects', index: 1 },
        reason: 'DROP',
        mode: 'FLUID',
        combine: null,
      } as DropResult);
    });

    await waitFor(() => expect(screen.getByText('Reorder failed')).toBeInTheDocument());
    const names = screen.getAllByText(/^(First|Second)$/).map((el) => el.textContent);
    expect(names).toEqual(['First', 'Second']);
  });
});

describe('ProjectForm - slug', () => {
  function titleInput() {
    return screen.getByText('Title').parentElement!.querySelector('input')!;
  }

  it('auto-fills the slug from the name for a project without a saved slug', () => {
    setup(makeProject({ name: 'New Project', slug: '' }));
    const slug = screen.getByLabelText('Slug') as HTMLInputElement;
    expect(slug.value).toBe('new-project');

    fireEvent.change(titleInput(), { target: { value: 'Enki App' } });
    expect(slug.value).toBe('enki-app');
  });

  it('stops auto-filling once the slug is edited by hand', () => {
    setup(makeProject({ name: 'New Project', slug: '' }));
    const slug = screen.getByLabelText('Slug') as HTMLInputElement;

    fireEvent.change(slug, { target: { value: 'custom-slug' } });
    fireEvent.change(titleInput(), { target: { value: 'Something Else' } });

    expect(slug.value).toBe('custom-slug');
  });

  it('does not rewrite an existing saved slug when the name changes', () => {
    setup(makeProject({ name: 'Old Name', slug: 'old-name' }));
    fireEvent.change(titleInput(), { target: { value: 'New Name' } });
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('old-name');
  });

  it('sends the slug to onSave', async () => {
    const { onSave } = setup(makeProject({ name: 'Enki App', slug: '' }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ slug: 'enki-app' })));
  });

  it('rejects an empty slug without calling onSave', async () => {
    const { onSave } = setup(makeProject({ slug: 'test-project' }));
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Slug is required.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a slug that is not URL-safe', async () => {
    const { onSave } = setup(makeProject({ slug: 'test-project' }));
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'Has Spaces' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/lowercase letters, numbers/);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a slug already used by another project', async () => {
    const onSave = vi.fn();
    render(
      <ProjectForm project={makeProject({ slug: 'mine' })} onSave={onSave} onCancel={vi.fn()} takenSlugs={['taken']} />
    );
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'taken' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That slug is already used by another project.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows a unique-violation error returned by the server', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('That slug is already used by another project.'));
    render(<ProjectForm project={makeProject({ slug: 'mine' })} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That slug is already used by another project.');
  });
});

describe('ProjectForm - GitHub repo URL', () => {
  it('saves a valid repo URL', async () => {
    const { onSave } = setup(makeProject({ slug: 'test-project' }));
    fireEvent.change(screen.getByLabelText('GitHub repo URL'), {
      target: { value: 'https://github.com/tarekFerdous/Rhubarb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ repo_url: 'https://github.com/tarekFerdous/Rhubarb' })
      )
    );
  });

  it('saves an empty repo URL as null', async () => {
    const { onSave } = setup(makeProject({ slug: 'test-project', repo_url: 'https://github.com/a/b' }));
    fireEvent.change(screen.getByLabelText('GitHub repo URL'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ repo_url: null })));
  });

  it('rejects a malformed repo URL without calling onSave', async () => {
    const { onSave } = setup(makeProject({ slug: 'test-project' }));
    fireEvent.change(screen.getByLabelText('GitHub repo URL'), {
      target: { value: 'https://gitlab.com/owner/repo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Repo URL must look like https://github.com/owner/repo.');
    expect(onSave).not.toHaveBeenCalled();
  });
});

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

describe('ProjectsManagerClient - Refresh READMEs', () => {
  beforeEach(() => {
    vi.mocked(refreshAllProjectReadmes).mockReset();
  });

  it('runs a refresh and shows a summary with failures and reasons', async () => {
    vi.mocked(refreshAllProjectReadmes).mockResolvedValue([
      { projectId: 'a', name: 'Qraving', outcome: 'ok' },
      { projectId: 'b', name: 'Rhubarb', outcome: 'no_readme' },
      { projectId: 'c', name: 'Enki', outcome: 'ok' },
      { projectId: 'd', name: 'Voting App', outcome: 'error', reason: 'no_access' },
    ]);
    render(<ProjectsManagerClient initialProjects={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh READMEs' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Refreshed 3 · Failed 1: Voting App (no access)');
    expect(refreshAllProjectReadmes).toHaveBeenCalledTimes(1);
  });

  it('disables the button with a progress label while the refresh runs', async () => {
    let resolveRefresh: (summary: ReadmeRefreshSummaryEntry[]) => void = () => {};
    vi.mocked(refreshAllProjectReadmes).mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );
    render(<ProjectsManagerClient initialProjects={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh READMEs' }));

    expect(await screen.findByRole('button', { name: /refreshing readmes/i })).toBeDisabled();

    await act(async () => resolveRefresh([{ projectId: 'a', name: 'Qraving', outcome: 'ok' }]));

    expect(screen.getByRole('button', { name: 'Refresh READMEs' })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Refreshed 1');
  });

  it('shows an inline error when the refresh itself fails', async () => {
    vi.mocked(refreshAllProjectReadmes).mockRejectedValue(new Error('Refresh failed'));
    render(<ProjectsManagerClient initialProjects={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh READMEs' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh failed');
  });

  it('updates row statuses after a refresh without a reload', async () => {
    vi.mocked(refreshAllProjectReadmes).mockResolvedValue([
      {
        projectId: 'a',
        name: 'Qraving',
        outcome: 'error',
        reason: 'rate_limited',
        status: { fetched_at: null, last_error: 'rate_limited', has_markdown: false },
      },
    ]);
    const projects = [makeFullProject({ id: 'a', name: 'Qraving', bg_color: '#123456', repo_url: 'https://github.com/o/q' })];
    render(<ProjectsManagerClient initialProjects={projects} />);
    expect(screen.getByTestId('readme-status')).toHaveTextContent('README not fetched yet');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh READMEs' }));

    await waitFor(() => expect(screen.getByTestId('readme-status')).toHaveTextContent('Fetch failed: rate limited'));
  });
});

describe('ProjectsManagerClient - README status per row', () => {
  function renderWithStatus(status?: Record<string, ReadmeStatus>) {
    render(
      <ProjectsManagerClient
        initialProjects={[makeFullProject({ id: 'a', bg_color: '#123456', repo_url: 'https://github.com/o/r' })]}
        initialReadmeStatuses={status}
      />
    );
    return screen.getByTestId('readme-status');
  }

  it('shows a relative fetched time', () => {
    const status = renderWithStatus({ a: { fetched_at: hoursAgo(2), last_error: null, has_markdown: true } });
    expect(status).toHaveTextContent('README fetched 2 hours ago');
  });

  it('shows "No README" when the repo has none', () => {
    const status = renderWithStatus({ a: { fetched_at: hoursAgo(2), last_error: null, has_markdown: false } });
    expect(status).toHaveTextContent(/^No README$/);
  });

  it.each([
    ['no_access', 'no access'],
    ['rate_limited', 'rate limited'],
    ['network', 'network error'],
  ] as const)('shows "Fetch failed" for a %s error', (reason, label) => {
    const status = renderWithStatus({ a: { fetched_at: null, last_error: reason, has_markdown: false } });
    expect(status).toHaveTextContent(new RegExp(`^Fetch failed: ${label}$`));
  });

  it('still shows when the README was last fetched after a failure', () => {
    const status = renderWithStatus({ a: { fetched_at: hoursAgo(2), last_error: 'network', has_markdown: true } });
    expect(status).toHaveTextContent('Fetch failed: network error · README fetched 2 hours ago');
  });

  it('shows "README not fetched yet" for a repo with no stored row', () => {
    expect(renderWithStatus()).toHaveTextContent('README not fetched yet');
  });

  it('shows no README status for a project without a repo_url', () => {
    render(<ProjectsManagerClient initialProjects={[makeFullProject({ id: 'a', bg_color: '#123456', repo_url: null })]} />);
    expect(screen.queryByTestId('readme-status')).toBeNull();
  });
});

describe('ProjectsManagerClient - README sync on save', () => {
  beforeEach(() => {
    vi.mocked(upsertProject).mockReset();
  });

  function renderAndEdit(project: Project, statuses?: Record<string, ReadmeStatus>) {
    render(<ProjectsManagerClient initialProjects={[project]} initialReadmeStatuses={statuses} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  }

  function saveWithRepoUrl(value: string) {
    fireEvent.change(screen.getByLabelText('GitHub repo URL'), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
  }

  it('shows an amber note and keeps the form open when the README fetch fails', async () => {
    vi.mocked(upsertProject).mockResolvedValue({
      readme: {
        outcome: 'error',
        reason: 'no_access',
        status: { fetched_at: null, last_error: 'no_access', has_markdown: false },
      },
    });
    renderAndEdit(makeFullProject({ id: 'a', bg_color: '#123456' }));
    saveWithRepoUrl('https://github.com/o/new');

    const note = await screen.findByText("Saved, but the README couldn't be fetched: no access");
    expect(note.className).toContain('text-amber-600');
    expect(screen.queryByText('Saved!')).toBeNull();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    expect(screen.getByTestId('readme-status')).toHaveTextContent('Fetch failed: no access');
  });

  it('closes the form and shows the fresh status after a successful README fetch', async () => {
    vi.mocked(upsertProject).mockResolvedValue({
      readme: { outcome: 'ok', status: { fetched_at: new Date().toISOString(), last_error: null, has_markdown: true } },
    });
    renderAndEdit(makeFullProject({ id: 'a', bg_color: '#123456' }));
    saveWithRepoUrl('https://github.com/o/new');

    await waitFor(() => expect(screen.queryByRole('button', { name: /^save$/i })).toBeNull());
    expect(screen.getByTestId('readme-status')).toHaveTextContent(/README fetched/);
  });

  it('clears the status when the repo_url is removed', async () => {
    vi.mocked(upsertProject).mockResolvedValue({ readme: { outcome: 'removed', status: null } });
    renderAndEdit(makeFullProject({ id: 'a', bg_color: '#123456', repo_url: 'https://github.com/o/r' }), {
      a: { fetched_at: hoursAgo(2), last_error: null, has_markdown: true },
    });
    saveWithRepoUrl('');

    await waitFor(() => expect(screen.queryByTestId('readme-status')).toBeNull());
    expect(upsertProject).toHaveBeenCalledWith(expect.objectContaining({ repo_url: null }));
  });
});
