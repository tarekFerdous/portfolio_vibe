import { BackgroundWebGL } from '@/components/dashboard/BackgroundWebGL';
import { IdentityBlock } from '@/components/dashboard/IdentityBlock';
import { SkillChipsRow } from '@/components/dashboard/SkillChipsRow';
import { PrimaryNavButtons } from '@/components/dashboard/PrimaryNavButtons';
import { FloatingStatusTile } from '@/components/dashboard/FloatingStatusTile';
import { DashboardThemeToggle } from '@/components/dashboard/DashboardThemeToggle';

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen w-full bg-transparent overflow-hidden flex flex-col justify-start items-center pt-[15vh] pb-10">
      {/* Absolute theme toggle */}
      <DashboardThemeToggle />

      {/* WebGL background layer */}
      <BackgroundWebGL />

      {/* Decorative accent tile */}
      <FloatingStatusTile />

      {/* Main Centered Content */}
      <div className="relative z-10 w-full max-w-[560px] md:max-w-[640px] lg:max-w-[720px] px-[20px] sm:px-[24px] lg:px-[32px] mx-auto flex flex-col items-center gap-y-12">
        
        {/* Profile Block */}
        <IdentityBlock />
        
        {/* Skills Chips */}
        <SkillChipsRow />

        {/* Fading Divider */}
        <div className="w-full max-w-sm h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
        
        {/* Primary Navigation Pills */}
        <PrimaryNavButtons />
        
      </div>
    </div>
  );
}
