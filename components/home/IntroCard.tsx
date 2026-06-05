import Image from 'next/image';
import { introduction_text } from '@/lib/text';

export function IntroCard() {
  return (
    <section className="relative w-full lg:w-[70vw] mx-auto mt-8 px-4 lg:px-0">
      {/* Profile photo — centered, overlaps cover/content boundary by 60px each side */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[90px] md:top-[140px] z-10">
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 shadow-lg bg-slate-200">
          <Image
            src="/images/avatar.svg"
            alt="Tarek Ferdous"
            width={120}
            height={120}
            className="object-cover w-full h-full"
            priority
          />
        </div>
      </div>

      {/* Card — overflow:hidden clips both cover and content to 24px radius */}
      <div className="rounded-[24px] overflow-hidden">
        {/* Cover photo */}
        <div className="relative h-[150px] md:h-[200px] bg-gradient-to-br from-violet-400 to-purple-600">
          <Image
            src="/images/cover.svg"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Content area */}
        <div className="relative pt-[76px] pb-10">
          {/* Glass background layer — backdrop-filter kept separate from SVG filter to avoid conflict */}
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(2px) saturate(1.6) brightness(1.06)',
              WebkitBackdropFilter: 'blur(2px) saturate(1.6) brightness(1.06)',
              background: 'var(--intro-glass-bg)',
              border: '1px solid var(--intro-glass-border)',
              boxShadow: 'var(--intro-glass-shadow)',
            }}
          />
          {/* Specular highlight — simulates iOS glass top-edge light */}
          <div
            className="absolute inset-x-0 top-0 h-[35%] pointer-events-none z-[1]"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, transparent 100%)',
            }}
          />

          {/* Content — above glass layer, unaffected by displacement filter */}
          <div className="relative z-10 text-center px-8">
            <h1
              className="text-gray-900 dark:text-gray-50"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                fontWeight: 100,
                fontSize: '70px',
                lineHeight: 1.1,
              }}
            >
              Tarek Ferdous
            </h1>
            <p className="mt-4 text-gray-700 dark:text-gray-300 max-w-lg mx-auto leading-relaxed">
              {introduction_text}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
