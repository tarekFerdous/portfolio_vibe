import { Mail, Phone, MapPin, type LucideIcon } from 'lucide-react';
import type { Contacts } from '@/lib/supabase/types';

/** Each icon gets a distinct brand-safe accent glow. */
const PER_ICON_GLOW_COLORS = {
  email: '#3b82f6', // blue
  phone: '#10b981', // emerald
  location: '#f97316', // orange
} as const;

/**
 * Builds the layered `drop-shadow` filter that renders a soft colored halo
 * around an inline SVG icon. Two stacked shadows (tight + wide) read as a
 * single soft glow and stay visible on both light and dark backgrounds
 * because `drop-shadow` follows the icon's own alpha shape rather than
 * relying on background contrast.
 */
function glowFilter(hexColor: string): string {
  return `drop-shadow(0 0 3px ${hexColor}99) drop-shadow(0 0 8px ${hexColor}66)`;
}

type ContactSectionProps = {
  contacts: Contacts | null;
};

const bodyTextStyle = {
  fontFamily: 'var(--font-recursive)',
  fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
} as const;

/**
 * Normalizes a human-entered phone number into a `tel:`-safe value by
 * stripping everything except a leading `+` and digits, e.g.
 * `+1 438-342-5929` -> `+14383425929`.
 */
function normalizePhoneForTel(phone: string): string {
  const hasLeadingPlus = phone.trim().startsWith('+');
  const digits = phone.replace(/\D/g, '');
  return hasLeadingPlus ? `+${digits}` : digits;
}

type ContactItem = {
  key: keyof typeof PER_ICON_GLOW_COLORS;
  icon: LucideIcon;
  content: React.ReactNode;
};

export function ContactSection({ contacts }: ContactSectionProps) {
  const items: ContactItem[] = [];

  if (contacts?.email) {
    items.push({
      key: 'email',
      icon: Mail,
      content: (
        <a href={`mailto:${contacts.email}`} className="hover:underline">
          {contacts.email}
        </a>
      ),
    });
  }

  if (contacts?.phone) {
    items.push({
      key: 'phone',
      icon: Phone,
      content: (
        <a href={`tel:${normalizePhoneForTel(contacts.phone)}`} className="hover:underline">
          {contacts.phone}
        </a>
      ),
    });
  }

  if (contacts?.location) {
    items.push({
      key: 'location',
      icon: MapPin,
      content: contacts.location,
    });
  }

  return (
    <section id="contact" className="w-full lg:w-[70vw] mx-auto mt-4 px-4 py-12 lg:px-0">
      {items.length > 0 && (
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-16">
          {items.map(({ key, icon: Icon, content }) => (
            <div key={key} className="flex items-center gap-3">
              <Icon
                size={20}
                className="flex-shrink-0 text-gray-700 dark:text-gray-300"
                style={{ filter: glowFilter(PER_ICON_GLOW_COLORS[key]) }}
                aria-hidden="true"
              />
              <span className="text-gray-700 dark:text-gray-300" style={bodyTextStyle}>
                {content}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
