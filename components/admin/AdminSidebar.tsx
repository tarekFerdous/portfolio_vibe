'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

const sections = [
  { label: 'Intro', href: '/me/intro' },
  { label: 'Projects', href: '/me/projects' },
  { label: 'Blog', href: '/me/blog' },
  { label: 'Contacts', href: '/me/contacts' },
  { label: 'Comments', href: '/me/comments' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/me/login');
  }

  return (
    <aside
      className="w-56 shrink-0 flex flex-col gap-1 p-4 rounded-[20px] h-fit sticky top-24"
      style={{
        backdropFilter: 'var(--intro-glass-filter)',
        WebkitBackdropFilter: 'var(--intro-glass-filter)',
        background: 'var(--intro-glass-bg)',
        border: '1px solid var(--intro-glass-border)',
        boxShadow: 'var(--intro-glass-shadow)',
      }}
    >
      <p
        className="text-gray-500 dark:text-gray-400 px-3 pb-2 text-xs font-semibold uppercase tracking-wider"
      >
        Admin
      </p>
      {sections.map((s) => {
        const active = pathname.startsWith(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`px-3 py-2 rounded-xl text-sm transition-colors ${
              active
                ? 'bg-gray-900 dark:bg-gray-100 text-gray-50 dark:text-gray-900 font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
            }`}
            style={{ fontFamily: 'var(--font-recursive)' }}
          >
            {s.label}
          </Link>
        );
      })}
      <div className="mt-auto pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
        <button
          onClick={handleSignOut}
          className="w-full px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
          style={{ fontFamily: 'var(--font-recursive)' }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
