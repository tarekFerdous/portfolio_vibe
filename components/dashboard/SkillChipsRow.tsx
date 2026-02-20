import { Smartphone, Bot, Layers, Sparkles } from 'lucide-react';
import { dashboardData } from '@/data/mock/dashboard';

const getIcon = (id: string, className: string) => {
  switch (id) {
    case 'ios':
      return <Smartphone className={className} />;
    case 'android':
      return <Bot className={className} />;
    case 'flutter':
      return <Layers className={className} />;
    case 'ai':
      return <Sparkles className={className} />;
    default:
      return null;
  }
};

export const SkillChipsRow = () => {
  return (
    <div className="flex flex-wrap justify-center gap-[10px] w-full max-w-[400px] mx-auto sm:max-w-none sm:flex-nowrap mt-4">
      {dashboardData.chips.map((chip) => (
        <div
          key={chip.id}
          className="h-[34px] px-[14px] rounded-full flex items-center justify-center space-x-2 
            bg-[rgba(15,23,42,0.05)] border border-[rgba(15,23,42,0.10)]
            text-gray-700 
            dark:bg-[rgba(255,255,255,0.06)] dark:border-[rgba(255,255,255,0.08)]
            dark:text-gray-200
            transition-all duration-300 hover:bg-[rgba(15,23,42,0.08)] dark:hover:bg-[rgba(255,255,255,0.10)]
            dark:hover:border-[rgba(255,255,255,0.15)] backdrop-blur-[18px] cursor-default"
        >
          {getIcon(
            chip.id,
            'w-[14px] h-[14px] text-accents-chipIconLight dark:text-accents-chipIconDark'
          )}
          <span className="text-[13px] font-semibold">{chip.label}</span>
        </div>
      ))}
    </div>
  );
};
