export const FloatingStatusTile = () => {
  return (
    <div className="hidden xl:flex absolute left-[15%] top-1/2 -translate-y-1/2 z-10 items-center justify-center pointer-events-none">
      <div className="relative w-[18px] h-[18px] rounded-[6px] bg-accents-statusGreenBase shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-accents-statusGreenBase blur-[8px] opacity-70 scale-150 animate-pulse pointer-events-none"></div>
      </div>
    </div>
  );
};
