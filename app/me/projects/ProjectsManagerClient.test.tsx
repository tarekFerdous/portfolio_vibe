import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProjectForm, ProjectsManagerClient } from './ProjectsManagerClient';
import { setProjectVisibility, deleteProject, reorderProjects, upsertProject } from '@/lib/actions/projects';
import { colorForId, pickRandomColor, projectColorPalette } from '@/lib/colors';
import type { DropResult } from '@hello-pangea/dnd';
import type { Project } from '@/lib/supabase/types';

vi.mock('@/lib/actions/projects', () => ({
  uploadProjectCover: vi.fn().mockResolvedValue('https://example.com/cover.jpg'),
  deleteProjectCover: vi.fn().mockResolvedValue(undefined),
  upsertProject: vi.fn().mockResolvedValue(undefined),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  reorderProjects: vi.fn().mockResolvedValue(undefined),
  setProjectVisibility: vi.fn().mockResolvedValue(undefined),
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
