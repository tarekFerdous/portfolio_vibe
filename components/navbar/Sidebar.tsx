'use client';

import type { ReactNode } from 'react';
import { SquircleWrap } from '@/components/ui/SquircleWrap';

function AboutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4h7v7H4zm0 9h7v7H4zm9-9h7v7h-7zm0 9h7v7h-7z" />
    </svg>
  );
}

function BlogIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h5v1.5H8V16zm0-6h3v1.5H8V10z" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

const navItems: { label: string; href: string; icon: ReactNode; target?: string; rel?: string }[] = [
  { label: 'About', href: '#about', icon: <AboutIcon /> },
  { label: 'Projects', href: '#projects', icon: <ProjectsIcon /> },
  { label: 'Blog', href: '/blog', icon: <BlogIcon /> },
  { label: 'Resume', href: '/tarek_ferdous_resume.pdf', icon: <ResumeIcon />, target: '_blank', rel: 'noopener noreferrer' },
  { label: 'Contact', href: '#contact', icon: <ContactIcon /> },
];

function NavItem({ label, href, icon, size, target, rel }: { label: string; href: string; icon: ReactNode; size: number; target?: string; rel?: string }) {
  return (
    <a href={href} target={target} rel={rel} className="group flex flex-col items-center gap-1">
      <SquircleWrap
        size={size}
        className="bg-black/[0.06] dark:bg-white/[0.08] text-gray-700 dark:text-gray-300 group-hover:bg-black/10 dark:group-hover:bg-white/[0.14] transition-colors"
      >
        {icon}
      </SquircleWrap>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-none">
        {label}
      </span>
    </a>
  );
}

const panelClass =
  'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-lg';

export function Sidebar({ open }: { open: boolean }) {
  if (!open) return null;

  return (
    <>
      {/* Desktop — left floating vertical */}
      <aside
        className={`hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 flex-col gap-4 p-3 rounded-[20px] ${panelClass}`}
      >
        {navItems.map((item) => (
          <NavItem key={item.label} {...item} size={40} />
        ))}
      </aside>

      {/* Mobile / tablet — bottom floating horizontal */}
      <nav
        className={`lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-row gap-3 p-3 rounded-[20px] ${panelClass}`}
      >
        {navItems.map((item) => (
          <NavItem key={item.label} {...item} size={36} />
        ))}
      </nav>
    </>
  );
}
