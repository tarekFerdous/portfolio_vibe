'use client';

import { Smartphone, Share2, DollarSign } from 'lucide-react';
import { dashboardData } from '@/data/mock/dashboard';
import { useState } from 'react';

const getIcon = (id: string, className: string) => {
  switch (id) {
    case 'apps':
      return <Smartphone className={className} />;
    case 'social':
      return <Share2 className={className} />;
    case 'roadTo1k':
      return <DollarSign className={className} />;
    default:
      return null;
  }
};

export const PrimaryNavButtons = () => {
  const [activeTab, setActiveTab] = useState<string>('apps');

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-[14px] w-full mt-8 z-10">
      {dashboardData.navButtons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => setActiveTab(btn.id)}
          className={`relative h-[46px] sm:h-[48px] min-w-[140px] sm:min-w-[160px] px-[18px]
            rounded-[14px] flex items-center justify-center space-x-[8px]
            bg-white border border-[rgba(15,23,42,0.10)]
            shadow-[0_10px_24px_rgba(15,23,42,0.10)]
            dark:bg-[rgba(255,255,255,0.06)] dark:border-[rgba(255,255,255,0.10)]
            dark:shadow-[0_10px_26px_rgba(0,0,0,0.35)]
            transition-all duration-300 backdrop-blur-[18px]
            active:translate-y-[1px]
            hover:bg-[rgba(15,23,42,0.03)] dark:hover:bg-[rgba(255,255,255,0.08)]
            dark:hover:border-[rgba(255,255,255,0.15)]
            ${activeTab === btn.id ? 'ring-1 ring-secondary-500/50 dark:ring-secondary-400/50 bg-[rgba(15,23,42,0.02)]' : ''}
          `}
        >
          {getIcon(
            btn.id,
            `w-[18px] h-[18px] transition-colors duration-300 ${
              activeTab === btn.id
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300'
            }`
          )}
          <span
            className={`text-[14px] font-semibold transition-colors duration-300 ${
              activeTab === btn.id
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-800 dark:text-gray-200'
            }`}
          >
            {btn.label}
          </span>

          {/* Optional Badge */}
          {btn.badge && (
            <div className="absolute -top-[12px] right-1/2 translate-x-1/2 bg-accents-badgeRedBase text-accents-badgeRedTextOn text-[12px] font-bold px-[10px] py-[4px] rounded-full shadow-sm whitespace-nowrap z-20 pointer-events-none">
              {btn.badge}
            </div>
          )}
        </button>
      ))}
    </div>
  );
};
