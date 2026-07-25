import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchIntro, fetchIntroCoverPool, upsertIntro, deleteIntroCover } from './intro';

vi.mock('./images', () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(() => Promise.resolve(undefined)),
}));

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

beforeEach(() => {
  mockSupabase.from.mockReset();
});

describe('fetchIntro', () => {
  it('throws when the Supabase query returns an error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'connection refused' } })),
      })),
    });

    await expect(fetchIntro()).rejects.toThrow('connection refused');
  });
});

describe('fetchIntroCoverPool', () => {
  it('throws when the Supabase query returns an error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'query timed out' } })),
      })),
    });

    await expect(fetchIntroCoverPool()).rejects.toThrow('query timed out');
  });
});

describe('upsertIntro', () => {
  it('throws when the existing-row lookup returns an error', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'lookup failed' } })),
      })),
    });

    await expect(upsertIntro({ title: 'Engineer', summary: 'Bio' })).rejects.toThrow('lookup failed');
  });

  it('throws when the update call returns an error', async () => {
    const eqSpy = vi.fn(() => Promise.resolve({ error: { message: 'update failed' } }));
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'intro-1' }, error: null })),
      })),
      update: vi.fn(() => ({ eq: eqSpy })),
    });

    await expect(upsertIntro({ title: 'Engineer', summary: 'Bio' })).rejects.toThrow('update failed');
  });

  it('throws when the insert call returns an error (no existing row)', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: { message: 'insert failed' } })),
    });

    await expect(upsertIntro({ title: 'Engineer', summary: 'Bio' })).rejects.toThrow('insert failed');
  });
});

describe('deleteIntroCover', () => {
  it('throws when the Supabase delete call returns an error', async () => {
    const eqSpy = vi.fn(() => Promise.resolve({ error: { message: 'delete failed' } }));
    mockSupabase.from.mockReturnValue({
      delete: vi.fn(() => ({ eq: eqSpy })),
    });

    await expect(deleteIntroCover('cover-1', 'https://example.com/intro-covers/cover-1.jpg')).rejects.toThrow(
      'delete failed'
    );
  });
});
