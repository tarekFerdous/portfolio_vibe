'use client';

import dynamic from 'next/dynamic';

// Dynamically import the renderer to avoid SSR issues with canvas and window
const GradientBackground = dynamic(
  () => import('react-gradient-animation').then((mod) => mod.GradientBackground),
  { ssr: false }
);

export const BackgroundWebGL = () => {
  return (
    <div 
      className="fixed inset-0 w-full h-full pointer-events-none z-0 mix-blend-normal opacity-90 object-cover" 
      style={{ touchAction: 'none' }}
    >
      <GradientBackground
        count={8}
        size={{ min: 800, max: 1500, pulse: 0.2 }}
        speed={{ x: { min: 0.1, max: 0.5 }, y: { min: 0.1, max: 0.5 } }}
        colors={{
          background: "transparent",
          particles: ["#647FBC", "#91ADC8", "#AED6CF", "#FAFDD6", "#E8F0D6"],
        }}
        blending="overlay"
        opacity={{ center: 0.7, edge: 0 }}
        skew={0}
        translateYcorrection={false}
        shapes={["c"]}
      />
    </div>
  );
};
