import type { ReactNode } from 'react';

interface GlassCardProps {
  title: string;
  body: string;
  children?: ReactNode;
}

export function GlassCard({ title, body, children }: GlassCardProps) {
  return (
    <section className="relative w-full lg:w-[70vw] mx-auto mt-6 px-4 lg:px-0">
      <div className="rounded-[24px] overflow-hidden">
        <div className="relative py-12 px-10">
          {/* Glass background layer — backdrop-filter kept separate from SVG filter to avoid conflict */}
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'var(--intro-glass-filter)',
              WebkitBackdropFilter: 'var(--intro-glass-filter)',
              background: 'var(--intro-glass-bg)',
              border: '1px solid var(--intro-glass-border)',
              boxShadow: 'var(--intro-glass-shadow)',
            }}
          />
          {/* Specular highlight */}
          <div
            className="absolute inset-x-0 top-0 h-[30%] pointer-events-none z-[1]"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, transparent 100%)',
            }}
          />
          {/* Content */}
          <div className="relative z-10">
            <h2
              className="text-gray-900 dark:text-gray-50 text-center"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                fontWeight: 200,
                fontSize: '48px',
                lineHeight: 1.1,
              }}
            >
              {title}
            </h2>
            <p className="mt-4 text-gray-700 dark:text-gray-300 text-center max-w-lg mx-auto leading-relaxed">
              {body}
            </p>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
