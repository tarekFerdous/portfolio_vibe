'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

function SunIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

const TRACK_W = 52;
const TRACK_H = 28;
const THUMB_SIZE = 22;
const THUMB_INSET = 3;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div style={{ width: TRACK_W, height: TRACK_H, flexShrink: 0 }} />;
  }

  const isDark = resolvedTheme === 'dark';

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', !isDark);
    setTheme(next);
  };

  return (
    <button
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggle}
      style={{
        position: 'relative',
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        backgroundColor: isDark ? '#1c1c1e' : '#d1d5db',
        transition: 'background-color 250ms ease',
        flexShrink: 0,
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Mode icon on the empty side */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: isDark ? THUMB_INSET + 2 : undefined,
          right: isDark ? undefined : THUMB_INSET + 2,
          color: isDark ? '#6b7280' : '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>

      {/* Sliding thumb */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          left: isDark ? TRACK_W - THUMB_SIZE - THUMB_INSET : THUMB_INSET,
          transition: 'left 250ms ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.28)',
          pointerEvents: 'none',
        }}
      />
    </button>
  );
}
