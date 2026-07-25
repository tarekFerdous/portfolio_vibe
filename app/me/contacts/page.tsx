import { fetchContacts } from '@/lib/actions/contacts';
import { ContactsEditorForm } from './ContactsEditorForm';
import type { Contacts } from '@/lib/supabase/types';

export default async function ContactsPage() {
  let contacts: Contacts | null = null;
  let fetchError: string | null = null;
  try {
    contacts = await fetchContacts();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load contacts.';
  }

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Contacts
      </h1>
      <ContactsEditorForm initialContacts={contacts} fetchError={fetchError} />
    </div>
  );
}
