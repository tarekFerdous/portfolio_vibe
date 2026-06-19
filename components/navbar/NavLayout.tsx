'use client';

import { useState, type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import type { Contacts } from '@/lib/supabase/types';

interface NavLayoutProps {
  children: ReactNode;
  contacts?: Contacts | null;
}

export function NavLayout({ children, contacts }: NavLayoutProps) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Navbar open={open} onToggle={() => setOpen((o) => !o)} contacts={contacts} />
      <Sidebar open={open} contacts={contacts} />
      {children}
    </>
  );
}
