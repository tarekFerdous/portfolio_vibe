import { fetchContacts } from '@/lib/actions/contacts';
import { ContactsEditorForm } from './ContactsEditorForm';

export default async function ContactsPage() {
  const contacts = await fetchContacts();

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="text-gray-900 dark:text-gray-50"
        style={{ fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, fontSize: '56px', lineHeight: 1.1 }}
      >
        Contacts
      </h1>
      <ContactsEditorForm initialContacts={contacts} />
    </div>
  );
}
