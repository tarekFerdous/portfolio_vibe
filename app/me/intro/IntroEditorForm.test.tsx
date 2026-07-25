import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntroEditorForm } from './IntroEditorForm';
import { upsertIntro, deleteIntroCover } from '@/lib/actions/intro';
import type { Intro, IntroCover } from '@/lib/supabase/types';

vi.mock('@/lib/actions/intro', () => ({
  upsertIntro: vi.fn(),
  uploadIntroCover: vi.fn(),
  deleteIntroCover: vi.fn(),
}));

const intro: Intro = {
  id: 'intro-1',
  title: 'Software Engineer',
  summary: 'Bio',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function makeCover(overrides: Partial<IntroCover> = {}): IntroCover {
  return {
    id: 'cover-1',
    storage_path: 'cover-1.jpg',
    url: 'https://example.com/intro-covers/cover-1.jpg',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(upsertIntro).mockReset();
  vi.mocked(deleteIntroCover).mockReset();
});

describe('IntroEditorForm - save', () => {
  it('shows the success confirmation and no error when the save succeeds', async () => {
    vi.mocked(upsertIntro).mockResolvedValue(undefined);
    render(<IntroEditorForm initialIntro={intro} initialCovers={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Saved!')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an inline error and no success confirmation when the save fails', async () => {
    vi.mocked(upsertIntro).mockRejectedValue(new Error('Failed to save: network error'));
    render(<IntroEditorForm initialIntro={intro} initialCovers={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Failed to save: network error'));
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });
});

describe('IntroEditorForm - cover delete', () => {
  it('removes the cover on a successful delete', async () => {
    vi.mocked(deleteIntroCover).mockResolvedValue(undefined);
    const cover = makeCover();
    render(<IntroEditorForm initialIntro={intro} initialCovers={[cover]} />);

    fireEvent.click(screen.getByRole('button', { name: /delete cover/i }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /delete cover/i })).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('restores the cover and shows an inline error when the delete fails', async () => {
    vi.mocked(deleteIntroCover).mockRejectedValue(new Error('Failed to delete: storage error'));
    const cover = makeCover();
    render(<IntroEditorForm initialIntro={intro} initialCovers={[cover]} />);

    fireEvent.click(screen.getByRole('button', { name: /delete cover/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to delete: storage error')
    );
    expect(screen.getByRole('button', { name: /delete cover/i })).toBeInTheDocument();
  });
});
