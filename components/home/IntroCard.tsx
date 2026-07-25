import Image from 'next/image';
import { fetchIntro, fetchIntroCoverPool } from '@/lib/actions/intro';
import { introCardSummary } from '@/lib/text';

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function IntroCard() {
  const [intro, covers] = await Promise.all([fetchIntro(), fetchIntroCoverPool()]);

  const summary = intro?.summary || introCardSummary;
  const title = intro?.title || null;
  const cover = covers.length > 0 ? pickRandom(covers)?.url ?? null : null;

  return (
    <section className="relative w-full lg:w-[70vw] mx-auto mt-8 px-4 lg:px-0">
      <div className="absolute left-1/2 -translate-x-1/2 top-[90px] md:top-[140px] z-10">
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-4 border-white dark:border-neutral-900 shadow-lg bg-slate-200">
          <Image
            src="/images/avatar.jpeg"
            alt="Tarek Ferdous"
            width={120}
            height={120}
            className="object-cover w-full h-full"
            priority
          />
        </div>
      </div>

      <div className="rounded-[24px] overflow-hidden">
        <div className="relative h-[150px] md:h-[200px] bg-gradient-to-br from-violet-400 to-purple-600">
          {cover && (
            <Image
              src={cover}
              alt=""
              fill
              className="object-cover"
              priority
            />
          )}
        </div>

        <div className="relative pt-[76px] pb-10">
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
          <div className="relative z-10 text-center lg:text-left px-8">
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
            {title && (
              <p
                className="mt-1 text-gray-500 dark:text-gray-400"
                style={{
                  fontFamily: 'var(--font-recursive)',
                  fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 400, 'slnt' 0, 'CRSV' 0.5",
                  fontSize: '14pt',
                }}
              >
                {title}
              </p>
            )}
            <p
              className="mt-4 text-gray-700 dark:text-gray-300 max-w-lg lg:max-w-none mx-auto lg:mx-0 leading-relaxed"
              style={{
                fontFamily: 'var(--font-recursive)',
                fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
                fontSize: '15pt',
              }}
            >
              {summary}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
