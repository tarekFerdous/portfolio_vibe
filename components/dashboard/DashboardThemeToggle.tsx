'use client';

import { useThemeSwitch } from '@/components/shared/useThemeSwitch';
import { useState, useEffect } from 'react';

export const DashboardThemeToggle = () => {
  const { currentTheme, updateTheme } = useThemeSwitch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="absolute top-6 right-6 lg:top-8 lg:right-8 w-[54px] h-[30px] z-50"></div>;
  }

  const isDark = currentTheme === 'dark';

  return (
    <button
      onClick={updateTheme}
      className={`absolute top-6 right-6 lg:top-8 lg:right-8 w-[54px] h-[30px] rounded-full p-1 transition-colors duration-300 z-50 border
        ${
          isDark
            ? 'bg-gray-850 border-gray-800'
            : 'bg-gray-200 border-gray-200/50'
        }
      `}
      aria-label="Toggle Theme"
    >
      <div
        className={`w-5 h-5 rounded-full transition-transform duration-300 shadow-sm
          ${isDark ? 'translate-x-[24px] bg-gray-50' : 'translate-x-0 bg-white'}
        `}
      />
    </button>
  );
};
