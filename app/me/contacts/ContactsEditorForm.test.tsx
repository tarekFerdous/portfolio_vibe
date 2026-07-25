import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactsEditorForm } from './ContactsEditorForm';
import { upsertContacts } from '@/lib/actions/contacts';
import type { Contacts } from '@/lib/supabase/types';

vi.mock('@/lib/actions/contacts', () => ({
  upsertContacts: vi.fn(),
}));

const initialContacts: Contacts = {
  id: 'contacts-1',
  email: 'hello@example.com',
  phone: null,
  linkedin_url: null,
  github_url: null,
  location: null,
  hire_me_destination: null,
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('ContactsEditorForm - save failure', () => {
  it('shows an inline error and no success confirmation when the save fails', async () => {
    vi.mocked(upsertContacts).mockRejectedValueOnce(new Error('network unreachable'));
    render(<ContactsEditorForm initialContacts={initialContacts} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('network unreachable'));
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('shows the success confirmation and no error when the save succeeds', async () => {
    vi.mocked(upsertContacts).mockResolvedValueOnce(undefined);
    render(<ContactsEditorForm initialContacts={initialContacts} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getByText('Saved!')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('re-enables the Save button after a failed save so the user can retry', async () => {
    vi.mocked(upsertContacts).mockRejectedValueOnce(new Error('write failed'));
    render(<ContactsEditorForm initialContacts={initialContacts} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('write failed'));
    expect(saveButton).not.toBeDisabled();
  });
});

describe('ContactsEditorForm - failed initial fetch', () => {
  it('renders a visible error instead of the form when the initial fetch failed', () => {
    render(<ContactsEditorForm initialContacts={null} fetchError="could not reach database" />);

    expect(screen.getByRole('alert')).toHaveTextContent('could not reach database');
    expect(screen.queryByPlaceholderText('you@example.com')).not.toBeInTheDocument();
  });
});
