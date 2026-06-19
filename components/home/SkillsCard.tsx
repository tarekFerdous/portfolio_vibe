'use client';

import 'flag-icons/css/flag-icons.min.css';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { skillCategories, languageCompetencies, type Skill } from '@/lib/skills';
import { skillsSectionTitle, skillsSectionSummary } from '@/lib/text';

export function SkillsCard() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function iconColor(skill: Skill): string | undefined {
    if (!mounted || !skill.color) return undefined;
    if (resolvedTheme === 'dark' && skill.darkColor) return skill.darkColor;
    return skill.color;
  }
  return (
    <section className="relative w-full lg:w-[70vw] mx-auto mt-4 px-4 lg:px-0">
      <div
        className="relative rounded-[24px] overflow-hidden flex flex-col md:flex-row"
        style={{
          backdropFilter: 'var(--intro-glass-filter)',
          WebkitBackdropFilter: 'var(--intro-glass-filter)',
          background: 'var(--intro-glass-bg)',
          border: '1px solid var(--intro-glass-border)',
          boxShadow: 'var(--intro-glass-shadow)',
        }}
      >
        {/* Specular highlight */}
        <div
          className="absolute inset-x-0 top-0 h-[30%] pointer-events-none z-[1]"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.18) 0%, transparent 100%)',
          }}
        />

        {/* Left panel — title + summary */}
        <div className="relative z-10 flex flex-col justify-center px-8 py-8 md:w-1/5 md:py-12">
          <h2
            className="text-gray-900 dark:text-gray-50"
            style={{
              fontFamily: 'var(--font-barlow-condensed)',
              fontWeight: 100,
              fontSize: 'clamp(56px, 5vw, 70px)',
              lineHeight: 1.1,
            }}
          >
            {skillsSectionTitle}
          </h2>
          <p
            className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed"
            style={{
              fontFamily: 'var(--font-recursive)',
              fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
              fontSize: 'clamp(13pt, 1.2vw, 15pt)',
            }}
          >
            {skillsSectionSummary}
          </p>
        </div>

        {/* Divider — visible on md+ only */}
        <div
          className="hidden md:block self-stretch w-px flex-shrink-0"
          style={{ background: 'var(--intro-glass-border)' }}
        />

        {/* Right panel — icon grid + languages */}
        <div className="relative z-10 flex-1 px-8 py-8 md:py-12">
          {/* Skill categories */}
          <div className="flex flex-col gap-6">
            {skillCategories.map((category) => (
              <div key={category.name}>
                <p
                  className="mb-3 uppercase tracking-widest text-gray-400 dark:text-gray-500"
                  style={{
                    fontFamily: 'var(--font-recursive)',
                    fontVariationSettings:
                      "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
                    fontSize: '10px',
                  }}
                >
                  {category.name}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-4">
                  {category.skills.map((skill) => (
                    <div
                      key={skill.name}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <skill.icon
                        size={32}
                        {...(iconColor(skill)
                          ? { color: iconColor(skill) }
                          : { className: 'text-gray-700 dark:text-gray-300' })}
                      />
                      <span
                        className="text-gray-500 dark:text-gray-400"
                        style={{
                          fontFamily: 'var(--font-recursive)',
                          fontVariationSettings:
                            "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
                          fontSize: '10px',
                        }}
                      >
                        {skill.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Language competency */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p
              className="mb-3 uppercase tracking-widest text-gray-400 dark:text-gray-500"
              style={{
                fontFamily: 'var(--font-recursive)',
                fontVariationSettings:
                  "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
                fontSize: '10px',
              }}
            >
              Languages
            </p>
            <div className="flex flex-wrap gap-3">
              {languageCompetencies.map((entry) => (
                <div
                  key={entry.language}
                  className="flex items-center gap-2 rounded-full px-4 py-1.5 border border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-white/5"
                >
                  <span
                    className={`fi fi-${entry.countryCode}`}
                    style={{ fontSize: '16px', lineHeight: 1 }}
                  />
                  <span
                    className="text-gray-700 dark:text-gray-300"
                    style={{
                      fontFamily: 'var(--font-recursive)',
                      fontVariationSettings:
                        "'MONO' 0, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
                      fontSize: '13px',
                    }}
                  >
                    {entry.language}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    style={{
                      fontFamily: 'var(--font-recursive)',
                      fontVariationSettings:
                        "'MONO' 1, 'CASL' 0, 'wght' 500, 'slnt' 0, 'CRSV' 0.5",
                      fontSize: '11px',
                    }}
                  >
                    {entry.level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
