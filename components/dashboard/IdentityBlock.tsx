import { Activity, User } from 'lucide-react';
import { dashboardData } from '@/data/mock/dashboard';

export const IdentityBlock = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Pagination Indicators */}
      <div className="flex space-x-[6px] mb-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-[9px] h-[9px] rounded-sm transition-colors duration-300 ${
              i === 0
                ? 'bg-gray-700 dark:bg-white'
                : 'bg-gray-300 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Avatar Icon Tile */}
      <div className="w-16 h-16 rounded-[18px] bg-gray-900 shadow-[0_18px_50px_rgba(15,23,42,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)] flex items-center justify-center relative overflow-hidden group border border-gray-800 dark:border-gray-850">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-50 block" />
        <div className="relative text-white flex flex-col items-center justify-center">
          <User className="w-6 h-6 mb-[-8px] opacity-90" strokeWidth={2.5} />
          <Activity className="w-8 h-8 opacity-70" strokeWidth={3} />
        </div>
      </div>

      {/* Name and Tagline */}
      <div className="text-center mt-2 space-y-1">
        <h1 className="text-[40px] sm:text-[48px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.02em] text-gray-950 dark:text-gray-50">
          {dashboardData.meta.name}
        </h1>
        <p className="text-[18px] sm:text-[20px] font-medium leading-[1.3] tracking-[-0.01em] text-gray-700 dark:text-gray-300 opacity-80">
          {dashboardData.meta.tagline}
        </p>
      </div>
    </div>
  );
};
