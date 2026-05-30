'use client';

import { useState, type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function NavLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Navbar open={open} onToggle={() => setOpen((o) => !o)} />
      <Sidebar open={open} />
      {children}
    </>
  );
}
