import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchContacts, upsertContacts } from './contacts';

function makeSelectSingleBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  return builder;
}

const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const contactValues = {
  email: 'a@b.com',
  phone: null,
  linkedin_url: null,
  github_url: null,
  location: null,
  hire_me_destination: null,
};

beforeEach(() => {
  mockSupabase.from.mockClear();
});

describe('fetchContacts', () => {
  it('throws when the Supabase query returns an error', async () => {
    mockSupabase.from.mockReturnValue(
      makeSelectSingleBuilder({ data: null, error: { message: 'query failed' } })
    );

    await expect(fetchContacts()).rejects.toThrow('query failed');
  });

  it('returns the row when the query succeeds', async () => {
    const row = { id: '1', ...contactValues, updated_at: '2026-01-01T00:00:00.000Z' };
    mockSupabase.from.mockReturnValue(makeSelectSingleBuilder({ data: row, error: null }));

    await expect(fetchContacts()).resolves.toEqual(row);
  });
});

describe('upsertContacts', () => {
  it('throws when the existence check returns an error', async () => {
    mockSupabase.from.mockReturnValue(
      makeSelectSingleBuilder({ data: null, error: { message: 'lookup failed' } })
    );

    await expect(upsertContacts(contactValues)).rejects.toThrow('lookup failed');
  });

  it('throws when the update call returns an error', async () => {
    const selectBuilder = makeSelectSingleBuilder({ data: { id: 'existing-id' }, error: null });
    const eqSpy = vi.fn(() => Promise.resolve({ error: { message: 'update failed' } }));
    selectBuilder.update = vi.fn(() => ({ eq: eqSpy }));
    mockSupabase.from.mockReturnValue(selectBuilder);

    await expect(upsertContacts(contactValues)).rejects.toThrow('update failed');
  });

  it('throws when the insert call returns an error', async () => {
    const selectBuilder = makeSelectSingleBuilder({ data: null, error: null });
    selectBuilder.insert = vi.fn(() => Promise.resolve({ error: { message: 'insert failed' } }));
    mockSupabase.from.mockReturnValue(selectBuilder);

    await expect(upsertContacts(contactValues)).rejects.toThrow('insert failed');
  });

  it('updates the existing row when the lookup succeeds', async () => {
    const selectBuilder = makeSelectSingleBuilder({ data: { id: 'existing-id' }, error: null });
    const eqSpy = vi.fn(() => Promise.resolve({ error: null }));
    selectBuilder.update = vi.fn(() => ({ eq: eqSpy }));
    mockSupabase.from.mockReturnValue(selectBuilder);

    await expect(upsertContacts(contactValues)).resolves.toBeUndefined();
    expect(eqSpy).toHaveBeenCalledWith('id', 'existing-id');
  });
});
