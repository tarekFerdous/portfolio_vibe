import { describe, it, expect } from 'vitest';
import { skillCategories, languageCompetencies } from './skills';

describe('skillCategories', () => {
  it('is a non-empty array', () => {
    expect(skillCategories.length).toBeGreaterThan(0);
  });

  it('every category has a non-empty name', () => {
    for (const category of skillCategories) {
      expect(typeof category.name).toBe('string');
      expect(category.name.length).toBeGreaterThan(0);
    }
  });

  it('every category has a non-empty skills array', () => {
    for (const category of skillCategories) {
      expect(Array.isArray(category.skills)).toBe(true);
      expect(category.skills.length).toBeGreaterThan(0);
    }
  });

  it('every skill has a non-empty name and a defined icon function', () => {
    for (const category of skillCategories) {
      for (const skill of category.skills) {
        expect(typeof skill.name).toBe('string');
        expect(skill.name.length).toBeGreaterThan(0);
        expect(typeof skill.icon).toBe('function');
      }
    }
  });

  it('contains all five expected categories', () => {
    const names = skillCategories.map((c) => c.name);
    expect(names).toContain('Languages');
    expect(names).toContain('Frontend');
    expect(names).toContain('Backend');
    expect(names).toContain('ML / AI');
    expect(names).toContain('Infra / DevOps');
  });

  it('every skill color, when set, is a valid 6-digit hex string', () => {
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    for (const category of skillCategories) {
      for (const skill of category.skills) {
        if (skill.color !== undefined) {
          expect(skill.color).toMatch(hexRe);
        }
        if (skill.darkColor !== undefined) {
          expect(skill.darkColor).toMatch(hexRe);
        }
      }
    }
  });

  it('Next.js skill has both color and darkColor set', () => {
    const frontend = skillCategories.find((c) => c.name === 'Frontend')!;
    const nextjs = frontend.skills.find((s) => s.name === 'Next.js')!;
    expect(nextjs.color).toBe('#000000');
    expect(nextjs.darkColor).toBe('#ffffff');
  });
});

describe('languageCompetencies', () => {
  it('has exactly two entries', () => {
    expect(languageCompetencies).toHaveLength(2);
  });

  it('every entry has non-empty countryCode, language, and level fields', () => {
    for (const entry of languageCompetencies) {
      expect(typeof entry.countryCode).toBe('string');
      expect(entry.countryCode.length).toBeGreaterThan(0);
      expect(typeof entry.language).toBe('string');
      expect(entry.language.length).toBeGreaterThan(0);
      expect(typeof entry.level).toBe('string');
      expect(entry.level.length).toBeGreaterThan(0);
    }
  });

  it('includes English and French entries', () => {
    const languages = languageCompetencies.map((e) => e.language);
    expect(languages).toContain('English');
    expect(languages).toContain('French');
  });
});
