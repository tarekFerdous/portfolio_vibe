'use client';

import { Activity, User } from 'lucide-react';
import { dashboardData } from '@/data/mock/dashboard';
import { MainIcon } from '../icons/MainIcon';
import { useState, useEffect } from 'react';

const verbs = ['develop', 'build', 'refactor', 'ship', 'host'];

const TypewriterTagline = () => {
  const [currentVerbIndex, setCurrentVerbIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentVerb = verbs[currentVerbIndex];
    let timer: NodeJS.Timeout;

    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentText(currentVerb.substring(0, currentText.length - 1));
      }, 50); // Erase speed
    } else {
      timer = setTimeout(() => {
        setCurrentText(currentVerb.substring(0, currentText.length + 1));
      }, 100); // Type speed
    }

    if (!isDeleting && currentText === currentVerb) {
      timer = setTimeout(() => setIsDeleting(true), 1500); // Pause before erasing
    } else if (isDeleting && currentText === '') {
      setIsDeleting(false);
      setCurrentVerbIndex((prev) => (prev + 1) % verbs.length);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentVerbIndex]);

  return (
    <p className="text-[18px] sm:text-[20px] font-medium leading-[1.3] tracking-[-0.01em] text-gray-700 dark:text-gray-300 opacity-80 min-h-[26px]">
      I {currentText}<span className="animate-pulse">|</span> apps
    </p>
  );
};

export const IdentityBlock = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Avatar Icon Tile */}
      {/* <div className="w-24 h-24 rounded-[18px] shadow-[0_18px_50px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)] flex items-center justify-center relative overflow-hidden group ">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-50 block" />
          <div className="relative text-white flex flex-col items-center justify-center">
            <User className="w-6 h-6 mb-[-8px] opacity-90" strokeWidth={2.5} />
            <Activity className="w-8 h-8 opacity-70" strokeWidth={3} />
          </div>
      </div> */}

      {/* Name and Tagline */}
      <div className="text-center mt-2 space-y-1">
        <h1 className="text-[40px] sm:text-[48px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.02em] text-gray-800 dark:text-gray-50 flex justify-center">
          <div className="relative flex items-baseline">
            <span>T</span>
            <span className="relative flex justify-center">
              <MainIcon className="absolute bottom-[65%] w-[80px] sm:w-[90px] md:w-[100px] h-auto text-current mb-[5px]" />
              are
            </span>
            <span>k</span>
            <span className="ml-[0.25em]">Ferdous</span>
          </div>
        </h1>
        <TypewriterTagline />
      </div>
    </div>
  );
};
